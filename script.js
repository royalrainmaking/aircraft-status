// ฟังก์ชันสำหรับดึงข้อมูลทุกวันที่และเก็บไว้ใน cache
async function prefetchAllDates() {
    console.log("🔄 เริ่มต้นการดึงข้อมูลทุกวันที่เพื่อเก็บใน cache...");
    
    try {
        const sheetID = "1_M74Pe_4uul0fkcEea8AMxQIMcPznNZ9ttCqvbeQgBs";
        const aircraftSheetGID = "705816349";
        const allDatesKey = 'allCachedDates';
        
        // ตรวจสอบว่ามีรายการวันที่ที่มีใน cache หรือไม่
        let cachedDates = [];
        const cachedDatesStr = localStorage.getItem(allDatesKey);
        if (cachedDatesStr) {
            try {
                cachedDates = JSON.parse(cachedDatesStr);
                console.log(`📋 พบรายการวันที่ที่มีใน cache จำนวน ${cachedDates.length} วันที่`);
            } catch (e) {
                console.error("❌ ไม่สามารถแปลงข้อมูลรายการวันที่ได้:", e);
            }
        }
        
        // URL สำหรับดึงข้อมูลทั้งหมด
        const aircraftURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${aircraftSheetGID}`;
        
        // ดึงข้อมูลทั้งหมด
        console.log("📡 กำลังดึงข้อมูลวันที่ทั้งหมดจาก Google Sheets...");
        const response = await fetch(aircraftURL, { 
            cache: 'no-store',  // ไม่ใช้ cache ของ browser
            headers: { 'Cache-Control': 'no-cache' }
        });
        const text = await response.text();
        const json = JSON.parse(text.substring(47, text.length - 2));
        
        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (json && json.table && json.table.rows && json.table.rows.length > 0) {
            console.log(`📊 ดึงข้อมูลจาก Google Sheets สำเร็จ จำนวน ${json.table.rows.length} แถว`);
            
            // รายการวันที่ที่พบ
            const foundDates = [];
            const datesToFetch = [];
            
            // วนลูปตรวจสอบทุกแถว
            for (let i = 0; i < json.table.rows.length; i++) {
                const row = json.table.rows[i];
                
                // ตรวจสอบว่ามีข้อมูลในคอลัมน์ A (วันที่) หรือไม่
                if (row.c && row.c[0] && row.c[0].v) {
                    // ดึงค่าวันที่จากคอลัมน์ A
                    let rowDate = row.c[0].v;
                    let formattedDate = "";
                    
                    // แปลงวันที่ให้เป็นรูปแบบ YYYY-MM-DD
                    if (rowDate instanceof Date) {
                        const year = rowDate.getFullYear();
                        const month = String(rowDate.getMonth() + 1).padStart(2, '0');
                        const day = String(rowDate.getDate()).padStart(2, '0');
                        formattedDate = `${year}-${month}-${day}`;
                    } else if (typeof rowDate === 'string') {
                        // แปลงรูปแบบวันที่ต่างๆ เป็น YYYY-MM-DD
                        if (rowDate.includes('/')) {
                            const parts = rowDate.split('/');
                            if (parts.length === 3) {
                                const day = parts[0].padStart(2, '0');
                                const month = parts[1].padStart(2, '0');
                                let year = parts[2];
                                if (year.length === 2) year = `20${year}`;
                                formattedDate = `${year}-${month}-${day}`;
                            }
                        } else if (rowDate.includes('-')) {
                            const parts = rowDate.split('-');
                            if (parts.length === 3) {
                                if (parts[0].length === 4) {
                                    // เป็นรูปแบบ YYYY-MM-DD อยู่แล้ว
                                    formattedDate = rowDate;
                                } else {
                                    // อาจเป็นรูปแบบ DD-MM-YYYY
                                    const day = parts[0].padStart(2, '0');
                                    const month = parts[1].padStart(2, '0');
                                    let year = parts[2];
                                    if (year.length === 2) year = `20${year}`;
                                    formattedDate = `${year}-${month}-${day}`;
                                }
                            }
                        }
                    }
                    
                    // ถ้าสามารถแปลงวันที่ได้ และยังไม่มีในรายการ
                    if (formattedDate && !foundDates.includes(formattedDate)) {
                        foundDates.push(formattedDate);
                        
                        // ตรวจสอบว่าวันที่นี้มีใน cache แล้วหรือไม่
                        const cacheKey = `flightDataCache_${formattedDate}`;
                        const timestampKey = `flightDataTimestamp_${formattedDate}`;
                        const cachedData = localStorage.getItem(cacheKey);
                        const cachedTimestamp = localStorage.getItem(timestampKey);
                        const currentTime = new Date().getTime();
                        const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 1 วัน
                        
                        // ถ้ายังไม่มีใน cache หรือข้อมูลหมดอายุแล้ว ให้เตรียมดึงข้อมูลใหม่
                        if (!cachedData || !cachedTimestamp || (currentTime - parseInt(cachedTimestamp) >= CACHE_EXPIRATION)) {
                            // เก็บวันที่ที่ต้องดึงข้อมูลใหม่ไว้ในอาร์เรย์
                            datesToFetch.push(formattedDate);
                        } else {
                            console.log(`📋 มีข้อมูลใน cache สำหรับวันที่ ${formattedDate} แล้ว`);
                            
                            // เพิ่มวันที่ลงในรายการวันที่ที่มีใน cache เพื่อให้ dashboard เห็นวันที่ที่มีข้อมูล
                            if (typeof window.addDateToCache === 'function') {
                                window.addDateToCache(formattedDate);
                            }
                        }
                    }
                }
            }
            
            // บันทึกรายการวันที่ทั้งหมดที่พบลงใน localStorage
            // รวมรายการวันที่ที่พบใหม่กับที่มีอยู่แล้ว โดยไม่ซ้ำ
            const combinedDates = [...new Set([...cachedDates, ...foundDates])].sort();
            
            // บันทึกรายการวันที่ทั้งหมดลงใน localStorage
            localStorage.setItem(allDatesKey, JSON.stringify(combinedDates));
            console.log(`✅ พบวันที่ทั้งหมด ${foundDates.length} วันที่ (รวมทั้งหมด ${combinedDates.length} วันที่)`);
            
            // ดึงข้อมูลสำหรับวันที่ที่ต้องอัปเดตแบบ batch (ทีละหลายวัน)
            if (datesToFetch.length > 0) {
                console.log(`🔄 ต้องดึงข้อมูลใหม่สำหรับ ${datesToFetch.length} วันที่`);
                
                // แบ่งการดึงข้อมูลเป็นชุด ชุดละไม่เกิน 5 วัน เพื่อไม่ให้ดึงข้อมูลพร้อมกันมากเกินไป
                const batchSize = 5;
                for (let i = 0; i < datesToFetch.length; i += batchSize) {
                    const batch = datesToFetch.slice(i, i + batchSize);
                    console.log(`📦 กำลังดึงข้อมูลชุดที่ ${Math.floor(i/batchSize) + 1} จำนวน ${batch.length} วันที่`);
                    
                    // ดึงข้อมูลพร้อมกันหลายวันที่ในแต่ละชุด
                    await Promise.all(batch.map(async (date) => {
                        try {
                            console.log(`📅 กำลังดึงข้อมูลสำหรับวันที่: ${date}`);
                            
                            // เพิ่มวันที่ลงในรายการวันที่ที่มีใน cache
                            if (typeof window.addDateToCache === 'function') {
                                window.addDateToCache(date);
                            }
                            
                            // ใช้ silentMode = true เพื่อไม่ให้กระทบกับ UI
                            await fetchFlightData(date, true);
                        } catch (err) {
                            console.error(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลสำหรับวันที่ ${date}:`, err);
                        }
                    }));
                    
                    // หน่วงเวลาเล็กน้อยระหว่างแต่ละชุดเพื่อไม่ให้ server ทำงานหนักเกินไป
                    if (i + batchSize < datesToFetch.length) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                console.log(`✅ ดึงข้อมูลและเก็บใน cache สำเร็จสำหรับ ${datesToFetch.length} วันที่`);
            } else {
                console.log(`✅ ไม่มีวันที่ที่ต้องดึงข้อมูลใหม่`);
            }
        }
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูลทุกวันที่:", error);
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    console.log("เริ่มต้นแอปพลิเคชัน...");
    try {
        // ตั้งค่าตัวเลือกวันที่
        setupDateSelector();

        // โหลดข้อมูลก่อน
        await fetchFlightData();
        console.log("โหลดข้อมูลสำเร็จ");
        
        // เริ่มดึงข้อมูลทุกวันที่ทันทีเพื่อให้ dashboard สามารถใช้ข้อมูลได้
        console.log("🔄 กำลังเริ่มดึงข้อมูลทุกวันที่เพื่อเก็บใน cache สำหรับ dashboard...");
        prefetchAllDates();

        // สร้างแผนที่
        initMap();
        console.log("เริ่มต้นแผนที่สำเร็จ");

        // ตั้งค่าปุ่มต่างๆ
        setupAircraftListToggle();
        setupRefreshButton();
        setupRippleEffect();
        setupAircraftTypeFilter(); // เพิ่มการตั้งค่าปุ่มกรองประเภทเครื่องบิน

        // ตั้งค่าปุ่มควบคุมสำหรับมือถือ (ต้องเรียกหลังจากสร้างรายการเครื่องบินแล้ว)
        setupMobileControls();

        // รีเซ็ตขนาดแผนที่ให้เป็นเต็มจอ
        if (checkIsMobile()) {
            resetMapSize();
        }

        // บังคับให้แผนที่คำนวณขนาดใหม่อีกครั้ง
        if (map) {
            setTimeout(function() {
                map.invalidateSize();
                console.log("ปรับขนาดแผนที่อีกครั้ง");
            }, 500);
        }

        // เพิ่ม event listener สำหรับปุ่มแสดงรายการบนมือถือ
        const mobileListToggle = document.getElementById('mobileListToggle');
        if (mobileListToggle) {
            console.log("กำลังเพิ่ม event listener ให้กับปุ่มแสดงรายการบนมือถือ");

            // ลบ event listener ทั้งหมด
            mobileListToggle.removeEventListener('click', toggleMobileList);
            mobileListToggle.removeEventListener('click', showAircraftList);
            mobileListToggle.removeEventListener('click', hideAircraftList);
            mobileListToggle.onclick = null;

            // เพิ่ม event listener ใหม่แบบ inline เท่านั้น
            mobileListToggle.onclick = function(event) {
                if (event) event.preventDefault(); // ป้องกันการส่งฟอร์ม
                console.log("คลิกที่ปุ่มแสดงรายการ (DOMContentLoaded)");

                // ตรวจสอบข้อความบนปุ่ม
                const buttonText = mobileListToggle.innerText.trim();
                if (buttonText.includes("ซ่อนรายการ")) {
                    hideAircraftList();
                } else {
                    showAircraftList();
                }

                return false; // ป้องกันการส่งฟอร์ม
            };
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเริ่มต้นแอปพลิเคชัน:", error);
    }

    // ฟังก์ชันกรองภารกิจ/ฐานที่ตั้ง หรือ หมายเลขเครื่องบิน
    const missionBaseFilterInput = document.getElementById("missionBaseFilter");
    missionBaseFilterInput.addEventListener("input", function () {
        filterAircraftByNumberOrNameOrMission(missionBaseFilterInput.value.trim());
    });

    // เพิ่ม placeholder ที่ดีขึ้น
    missionBaseFilterInput.placeholder = "ค้นหาเครื่องบิน, สถานะ, ฐานที่ตั้ง...";

    // ตั้งค่าปุ่มล้างการค้นหา
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function () {
            // เคลียร์ค่าที่กรอกในช่องค้นหา
            document.getElementById('missionBaseFilter').value = "";
            // รีเซ็ตการแสดงผลเครื่องบินทั้งหมด
            filterAircraftByNumberOrNameOrMission("");
            // โฟกัสที่ช่องค้นหา
            missionBaseFilterInput.focus();
        });
    }

    // เพิ่มการกด Enter เพื่อค้นหา
    missionBaseFilterInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            filterAircraftByNumberOrNameOrMission(missionBaseFilterInput.value.trim());
        }
    });
});

// ฟังก์ชันค้นหาเครื่องบินตามหมายเลข, ชื่อ, หรือภารกิจ/ฐานที่ตั้ง
function filterAircraftByNumberOrNameOrMission(searchText) {
    console.log("กำลังค้นหา:", searchText);
    
    // ดึงรายการเครื่องบินทั้งหมด
    const aircraftItems = document.querySelectorAll(".aircraft-item");
    
    // ถ้าไม่มีข้อความค้นหา ให้แสดงทั้งหมด
    if (!searchText) {
        aircraftItems.forEach(item => {
            item.style.display = "flex";
        });
        return;
    }
    
    // แยกคำค้นหาออกเป็นคำย่อยๆ เมื่อมีช่องว่าง
    const searchTerms = searchText.split(/\s+/).filter(term => term.length > 0);
    
    let availableCount = 0;
    let unavailableCount = 0;
    
    // ค้นหาในแต่ละรายการ
    aircraftItems.forEach(item => {
        // ดึงข้อมูลที่ต้องการค้นหา
        const aircraftNumber = item.querySelector(".aircraft-number").textContent.toLowerCase();
        const aircraftName = item.querySelector(".aircraft-name").textContent.toLowerCase();
        
        // ดึงข้อมูลภารกิจ/ฐานที่ตั้ง และข้อมูลอื่นๆ
        const infoValues = item.querySelectorAll(".info-value");
        let infoTexts = [];
        infoValues.forEach(info => {
            infoTexts.push(info.textContent.toLowerCase());
        });
        
        // รวมข้อมูลทั้งหมดเพื่อค้นหา
        const allText = [aircraftNumber, aircraftName, ...infoTexts].join(" ");
        
        let matchFound = false;
        
        // ตรวจสอบแบบปกติ (ค้นหาทั้งประโยค)
        if (allText.includes(searchText.toLowerCase())) {
            matchFound = true;
        } else if (searchTerms.length > 1) {
            // ตรวจสอบแบบคำต่อคำ (ค้นหาแต่ละคำ)
            const allTermsMatch = searchTerms.every(term => allText.includes(term.toLowerCase()));
            if (allTermsMatch) {
                matchFound = true;
            }
        }
        
        // แสดงหรือซ่อนตามผลการค้นหา
        if (matchFound) {
            item.style.display = "flex";
            
            // นับจำนวนเครื่องบินที่พร้อมใช้งานและไม่พร้อมใช้งาน
            if (item.classList.contains("available")) {
                availableCount++;
            } else {
                unavailableCount++;
            }
        } else {
            item.style.display = "none";
        }
    });
    
    // อัปเดตสรุปจำนวนเครื่องบิน
    updateStatusSummary(availableCount, unavailableCount);
}



// ฟังก์ชันตั้งค่าตัวเลือกวันที่
function setupDateSelector() {
    const dateSelector = document.getElementById('dateSelector');
    const resetDateBtn = document.getElementById('resetDateBtn');

    if (dateSelector) {
        // ตั้งค่าวันที่เริ่มต้นเป็นวันนี้
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        dateSelector.value = formattedDate;

        // เพิ่ม event listener สำหรับการเปลี่ยนวันที่
        dateSelector.addEventListener('change', async function() {
            const selectedDate = dateSelector.value;
            console.log(`เลือกวันที่: ${selectedDate}`);

            try {
                // แสดงข้อความกำลังโหลด
                const listContainer = document.getElementById("aircraftList");
                if (listContainer) {
                    listContainer.innerHTML = "<p class='loading'>กำลังโหลดข้อมูล...</p>";
                }

                // โหลดข้อมูลตามวันที่ที่เลือก
                await fetchFlightData(selectedDate);

                // อัปเดตมาร์กเกอร์บนแผนที่
                updateMapMarkers();

                // ปิดไซด์บาร์ถ้ากำลังแสดงอยู่
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    // ถ้ามีฟังก์ชัน closeSidebar ให้เรียกใช้
                    if (typeof window.closeSidebar === 'function') {
                        window.closeSidebar();
                    } else {
                        // ถ้าไม่มีฟังก์ชัน closeSidebar ให้ปิดด้วยวิธีอื่น
                        sidebar.classList.remove('active');
                        sidebar.style.display = 'none';

                        // รีเซ็ตขนาดแผนที่
                        if (typeof window.resetMapSize === 'function') {
                            window.resetMapSize();
                        }
                    }
                }
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลตามวันที่:", error);
                alert("ไม่สามารถโหลดข้อมูลสำหรับวันที่ที่เลือกได้");
            }
        });
    }

    if (resetDateBtn) {
        // เพิ่ม event listener สำหรับปุ่มรีเซ็ตวันที่
        resetDateBtn.addEventListener('click', async function() {
            // ตั้งค่าวันที่เป็นวันนี้
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            dateSelector.value = formattedDate;

            try {
                // แสดงข้อความกำลังโหลด
                const listContainer = document.getElementById("aircraftList");
                if (listContainer) {
                    listContainer.innerHTML = "<p class='loading'>กำลังโหลดข้อมูลวันนี้...</p>";
                }

                // โหลดข้อมูลของวันนี้
                await fetchFlightData();

                // อัปเดตมาร์กเกอร์บนแผนที่
                updateMapMarkers();

                // ปิดไซด์บาร์ถ้ากำลังแสดงอยู่
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    // ถ้ามีฟังก์ชัน closeSidebar ให้เรียกใช้
                    if (typeof window.closeSidebar === 'function') {
                        window.closeSidebar();
                    } else {
                        // ถ้าไม่มีฟังก์ชัน closeSidebar ให้ปิดด้วยวิธีอื่น
                        sidebar.classList.remove('active');
                        sidebar.style.display = 'none';

                        // รีเซ็ตขนาดแผนที่
                        if (typeof window.resetMapSize === 'function') {
                            window.resetMapSize();
                        }
                    }
                }
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลวันนี้:", error);
                alert("ไม่สามารถโหลดข้อมูลสำหรับวันนี้ได้");
            }
        });
    }
}



// ฟังก์ชันสำหรับตั้งค่า ripple effect
function setupRippleEffect() {
    document.addEventListener('click', function(e) {
        const target = e.target;

        // ตรวจสอบว่าคลิกที่รายการเครื่องบินหรือไม่
        if (target.classList.contains('aircraft-item') || target.closest('.aircraft-item')) {
            const item = target.classList.contains('aircraft-item') ? target : target.closest('.aircraft-item');

            // สร้าง ripple effect
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            item.appendChild(ripple);

            // ตำแหน่งของ ripple
            const rect = item.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            // กำหนดสไตล์ของ ripple
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            // ลบ ripple หลังจากอนิเมชันเสร็จสิ้น
            setTimeout(() => {
                ripple.remove();
            }, 600);
        }
    });
}

// ฟังก์ชันสำหรับตั้งค่าปุ่มกรองประเภทเครื่องบิน
function setupAircraftTypeFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    let currentFilter = 'all'; // ค่าเริ่มต้นแสดงทั้งหมด

    // เพิ่ม event listener ให้กับปุ่มกรอง
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // ลบคลาส active จากทุกปุ่ม
            filterButtons.forEach(btn => btn.classList.remove('active'));

            // เพิ่มคลาส active ให้กับปุ่มที่คลิก
            this.classList.add('active');

            // อัปเดตตัวกรองปัจจุบัน
            currentFilter = this.getAttribute('data-type');
            console.log(`กรองประเภท: ${currentFilter}`);

            // กรองรายการเครื่องบินตามประเภท
            filterAircraftByType(currentFilter);
        });
    });
}

let markers = []; // ตัวแปรเก็บข้อมูลมาร์กเกอร์
let currentAircraftTypeFilter = 'all'; // ตัวแปรเก็บประเภทเครื่องบินที่กรองปัจจุบัน

// ฟังก์ชันกรองเครื่องบินตามประเภท (ทั้งหมด, เครื่องบิน, เฮลิคอปเตอร์)
function filterAircraftByType(type) {
    console.log(`กำลังกรองเครื่องบินตามประเภท: ${type}`);

    // ตรวจสอบว่ามีข้อมูลเครื่องบินหรือไม่
    if (!flightData || !Array.isArray(flightData) || flightData.length === 0) {
        console.warn("ไม่มีข้อมูลเครื่องบินสำหรับการกรอง");
        return;
    }

    // บันทึกประเภทการกรองปัจจุบัน
    currentAircraftTypeFilter = type;

    // ถ้าเลือกแสดงทั้งหมด
    if (type === 'all') {
        // กรองตามคำค้นหาปัจจุบัน (ถ้ามี)
        const missionBaseFilter = document.getElementById('missionBaseFilter');
        if (!missionBaseFilter) {
            console.warn("ไม่พบ element 'missionBaseFilter'");
            return;
        }

        const searchText = missionBaseFilter.value.trim();
        if (searchText) {
            filterAircraftByNumberOrNameOrMission(searchText);
        } else {
            // แสดงทั้งหมด
            generateAircraftList(flightData);
            showAllMarkers();
        }
        return;
    }

    // กรองตามประเภท (เครื่องบินหรือเฮลิคอปเตอร์)
    const filteredFlights = flightData.filter(flight => flight && flight.type === type);
    console.log(`พบ ${filteredFlights.length} รายการที่เป็นประเภท ${type}`);

    // แสดงรายการที่กรอง
    generateAircraftList(filteredFlights);

    // แสดงมาร์กเกอร์ที่กรอง
    showMarkers(filteredFlights);
}

// ฟังก์ชันกรองเครื่องบินตามหมายเลขเครื่องบิน, ชื่อเครื่องบิน หรือภารกิจ/ฐานที่ตั้ง
// ฟังก์ชันกรองการค้นหาจากหมายเลขเครื่องบิน, ชื่อเครื่องบิน, หรือภารกิจ/ฐานที่ตั้ง

function showMarkers(filteredFlights) {
    if (!markers || !Array.isArray(markers) || markers.length === 0) {
        console.warn("ไม่มีมาร์กเกอร์ที่จะแสดง");
        return;
    }

    if (!filteredFlights || !Array.isArray(filteredFlights) || filteredFlights.length === 0) {
        console.warn("ไม่มีข้อมูลเครื่องบินที่กรอง");
        return;
    }

    if (typeof map === 'undefined' || !map) {
        console.error("ไม่พบแผนที่ในฟังก์ชัน showMarkers");
        return;
    }

    markers.forEach(({ flight, marker }) => {
        try {
            // ตรวจสอบว่า flight และ marker มีค่าหรือไม่
            if (!flight || !marker) {
                console.warn("พบข้อมูล marker ที่ไม่สมบูรณ์");
                return;
            }

            // ตรวจสอบว่า flight.aircraftNumber มีค่าหรือไม่
            if (!flight.aircraftNumber) {
                console.warn("พบข้อมูลเครื่องบินที่ไม่มีหมายเลข");
                return;
            }

            if (filteredFlights.some(f => f && f.aircraftNumber && flight.aircraftNumber && f.aircraftNumber === flight.aircraftNumber)) {
                if (marker && !map.hasLayer(marker)) {
                    marker.addTo(map); // แสดงมาร์กเกอร์ที่ตรงกับคำค้นหา
                }
            } else {
                if (marker && map.hasLayer(marker)) {
                    map.removeLayer(marker); // ซ่อนมาร์กเกอร์ที่ไม่ตรงกับคำค้นหา
                }
            }
        } catch (error) {
            console.warn("เกิดข้อผิดพลาดในการแสดง/ซ่อนมาร์กเกอร์:", error);
        }
    });
}


// ฟังก์ชันในการแสดงมาร์กเกอร์ทั้งหมด
function showAllMarkers() {
    if (!markers || !Array.isArray(markers) || markers.length === 0) {
        console.warn("ไม่มีมาร์กเกอร์ที่จะแสดง");
        return;
    }

    if (typeof map === 'undefined' || !map) {
        console.error("ไม่พบแผนที่ในฟังก์ชัน showAllMarkers");
        return;
    }

    markers.forEach((markerData) => {
        try {
            // ตรวจสอบว่า markerData มีค่าหรือไม่
            if (!markerData) {
                console.warn("พบข้อมูล marker ที่ไม่สมบูรณ์");
                return;
            }

            const { marker } = markerData;

            if (marker && !map.hasLayer(marker)) {
                marker.addTo(map); // แสดงมาร์กเกอร์ทั้งหมด
            }
        } catch (error) {
            console.warn("เกิดข้อผิดพลาดในการแสดงมาร์กเกอร์:", error);
        }
    });
}

function hideMarkers() {
    if (!markers || !Array.isArray(markers) || markers.length === 0) {
        console.warn("ไม่มีมาร์กเกอร์ที่จะซ่อน");
        return;
    }

    if (typeof map === 'undefined' || !map) {
        console.error("ไม่พบแผนที่ในฟังก์ชัน hideMarkers");
        return;
    }

    markers.forEach((markerData) => {
        try {
            // ตรวจสอบว่า markerData มีค่าหรือไม่
            if (!markerData) {
                console.warn("พบข้อมูล marker ที่ไม่สมบูรณ์");
                return;
            }

            const { marker } = markerData;

            if (marker && map.hasLayer(marker)) {
                map.removeLayer(marker); // ซ่อนมาร์กเกอร์ทั้งหมด
            }
        } catch (error) {
            console.warn("เกิดข้อผิดพลาดในการซ่อนมาร์กเกอร์:", error);
        }
    });
}



// ฟังก์ชันสำหรับการแสดงรายการเครื่องบิน
function generateAircraftList(filteredFlights = flightData) {
    const listContainer = document.getElementById('aircraftList');
    if (!listContainer) {
        console.error("ไม่พบ element 'aircraftList'");
        return;
    }

    listContainer.innerHTML = ""; // ล้างรายการเดิม

    let availableCount = 0;
    let unavailableCount = 0;

    // ตรวจสอบว่ามีข้อมูลหรือไม่
    if (!filteredFlights || !Array.isArray(filteredFlights) || filteredFlights.length === 0) {
        listContainer.innerHTML = "<p class='no-results'>❌ ไม่พบเครื่องบินที่ตรงกับการค้นหา</p>";

        // อัปเดตสรุปจำนวนเครื่องบิน
        updateStatusSummary(0, 0);
        return;
    }
    
    // ใช้ฟังก์ชันส่วนที่ 2 เพื่อสร้างรายการเครื่องบิน
    // ไม่ต้องทำอะไรเพิ่มเติม เพราะ generateAircraftListPart2 จะจัดการเรื่องการนับและอัปเดตสถานะเอง
    generateAircraftListPart2(filteredFlights);
}

// ฟังก์ชันอัปเดตสรุปสถานะ
function updateStatusSummary(availableCount, unavailableCount) {
    const statusSummary = document.getElementById('statusSummary');
    if (!statusSummary) return;

    const availableElement = statusSummary.querySelector('.green');
    const unavailableElement = statusSummary.querySelector('.red');

    if (availableElement) {
        availableElement.setAttribute('data-count', availableCount);
        // อัปเดตตัวเลขในแบดจ์โดยตรง
        availableElement.textContent = availableCount;
    }

    if (unavailableElement) {
        unavailableElement.setAttribute('data-count', unavailableCount);
        // อัปเดตตัวเลขในแบดจ์โดยตรง
        unavailableElement.textContent = unavailableCount;
    }
}

// This duplicate function implementation has been removed to fix the syntax error

const provinceCoordinates = {
    "กรุงเทพมหานคร": [13.9126, 100.6068], // ท่าอากาศยานดอนเมือง
    "กระบี่": [8.0993, 98.9786], // ท่าอากาศยานนานาชาติกระบี่
    "กาญจนบุรี": [14.0039, 99.5501], // ไม่มีสนามบิน
    "กาฬสินธุ์": [16.4380, 103.5060], // ไม่มีสนามบิน
    "กำแพงเพชร": [16.4828, 99.5220], // ไม่มีสนามบิน
    "ขอนแก่น": [16.4666, 102.7836], // ท่าอากาศยานขอนแก่น
    "จันทบุรี": [12.6180, 102.1063], // สนามบินท่าใหม่
    "ฉะเชิงเทรา": [13.6904, 101.0779], // ไม่มีสนามบิน
    "ชลบุรี": [12.6799, 101.0046], // ท่าอากาศยานอู่ตะเภา
    "ชัยนาท": [15.1856, 100.1250], // ไม่มีสนามบิน
    "ชัยภูมิ": [15.8052, 102.0310], // ไม่มีสนามบิน
    "ชุมพร": [10.7112, 99.3616], // ท่าอากาศยานชุมพร
    "เชียงราย": [19.9553, 99.8829], // ท่าอากาศยานแม่ฟ้าหลวง เชียงราย
    "เชียงใหม่": [18.7666, 98.9620], // ท่าอากาศยานเชียงใหม่
    "ตรัง": [7.5086, 99.6166], // ท่าอากาศยานตรัง
    "ตราด": [12.2746, 102.3190], // ท่าอากาศยานตราด
    "ตาก": [16.8961, 99.2530], // ไม่มีสนามบิน
    "นครนายก": [14.0859, 101.2311], // ไม่มีสนามบิน
    "นครปฐม": [13.8198, 100.0401], // ไม่มีสนามบิน
    "นครพนม": [17.3973, 104.7754], // ท่าอากาศยานนครพนม
    "นครราชสีมา": [14.9498, 102.3130], // ท่าอากาศยานนครราชสีมา
    "นครศรีธรรมราช": [8.5396, 99.9447], // ท่าอากาศยานนครศรีธรรมราช
    "นครสวรรค์": [15.7112, 100.1153], // ไม่มีสนามบิน
    "นนทบุรี": [13.9074, 100.5211], // ไม่มีสนามบิน
    "นราธิวาส": [6.5206, 101.7431], // ท่าอากาศยานนราธิวาส
    "น่าน": [18.7727, 100.7857], // ท่าอากาศยานน่านนคร
    "บึงกาฬ": [18.4462, 103.0605], // ไม่มีสนามบิน
    "บุรีรัมย์": [15.2295, 103.2532], // ท่าอากาศยานบุรีรัมย์
    "ปทุมธานี": [14.0011, 100.5159], // ไม่มีสนามบิน
    "ประจวบคีรีขันธ์": [11.7886, 99.7989], // ท่าอากาศยานหัวหิน
    "ปราจีนบุรี": [13.9385, 101.4190], // ไม่มีสนามบิน
    "ปัตตานี": [6.8670, 101.2500], // ไม่มีสนามบิน
    "พระนครศรีอยุธยา": [14.3550, 100.5663], // ไม่มีสนามบิน
    "พังงา": [8.4225, 98.4878], // ไม่มีสนามบิน
    "พัทลุง": [7.6164, 100.0772], // ไม่มีสนามบิน
    "พิจิตร": [16.4480, 100.3530], // ไม่มีสนามบิน
    "พิษณุโลก": [16.7829, 100.2789], // ท่าอากาศยานพิษณุโลก
    "เพชรบุรี": [12.9687, 99.9573], // ไม่มีสนามบิน
    "เพชรบูรณ์": [16.6762, 101.1945], // ท่าอากาศยานเพชรบูรณ์
    "แพร่": [18.1322, 100.1657], // ท่าอากาศยานแพร่
    "มหาสารคาม": [15.3836, 103.2956], // ไม่มีสนามบิน
    "มุกดาหาร": [16.5400, 104.7107], // ไม่มีสนามบิน
    "แม่ฮ่องสอน": [19.3013, 97.9750], // ท่าอากาศยานแม่ฮ่องสอน
    "ยะลา": [6.5510, 101.2855], // ไม่มีสนามบิน
    "ยโสธร": [15.7921, 104.1452], // ไม่มีสนามบิน
    "ร้อยเอ็ด": [16.1164, 103.7736], // ท่าอากาศยานร้อยเอ็ด
    "ระนอง": [9.7776, 98.5855], // ท่าอากาศยานระนอง
    "ระยอง": [12.6799, 101.0046], // ท่าอากาศยานอู่ตะเภา
    "ราชบุรี": [13.5427, 99.8151], // ไม่มีสนามบิน
    "ลพบุรี": [14.8027, 100.6116], // ไม่มีสนามบิน
    "ลำปาง": [18.2726, 99.5042], // ท่าอากาศยานลำปาง
    "ลำพูน": [18.5785, 98.5314], // ไม่มีสนามบิน
    "ศรีสะเกษ": [15.1228, 104.3245], // ไม่มีสนามบิน
    "สกลนคร": [17.1960, 104.1185], // ท่าอากาศยานสกลนคร
    "สงขลา": [6.9320, 100.3927], // ท่าอากาศยานนานาชาติหาดใหญ่
    "สมุทรปราการ": [13.6894, 100.7500], // ท่าอากาศยานสุวรรณภูมิ
    "สมุทรสงคราม": [13.4149, 99.9803], // ไม่มีสนามบิน
    "สมุทรสาคร": [13.5659, 100.2833], // ไม่มีสนามบิน
    "สระแก้ว": [13.8251, 102.0691], // ไม่มีสนามบิน
    "สระบุรี": [14.5313, 100.8839], // ไม่มีสนามบิน
    "สิงห์บุรี": [14.8920, 100.3960], // ไม่มีสนามบิน
    "สุโขทัย": [17.2380, 99.8181], // ท่าอากาศยานสุโขทัย
    "สุพรรณบุรี": [14.4696, 100.1135], // ไม่มีสนามบิน
    "สุราษฎร์ธานี": [9.1326, 99.1356], // ท่าอากาศยานสุราษฎร์ธานี
    "สุรินทร์": [14.8683, 103.4983], // ท่าอากาศยานสุรินทร์ภักดี
    "หนองคาย": [17.8707, 102.7415], // ไม่มีสนามบิน
    "หนองบัวลำภู": [17.2137, 102.4067], // ไม่มีสนามบิน
    "อำนาจเจริญ": [15.8692, 104.6513], // ไม่มีสนามบิน
    "อุดรธานี": [17.3869, 102.7883], // ท่าอากาศยานนานาชาติอุดรธานี
    "อุตรดิตถ์": [17.6317, 100.0950], // ไม่มีสนามบิน
    "อุทัยธานี": [15.3796, 99.9066], // ไม่มีสนามบิน
    "สนามบินคลองหลวง": [14.11994317780348, 100.62058030298614] // สนามบินคลองหลวง (กรมฝนหลวงและการบินเกษตร)
};



// ฟังก์ชันสำหรับดึงข้อมูลทุกวันที่และเก็บไว้ใน cache
async function prefetchAllDates() {
    console.log("🔄 เริ่มต้นการดึงข้อมูลทุกวันที่เพื่อเก็บใน cache...");
    try {
        const sheetID = "1_M74Pe_4uul0fkcEea8AMxQIMcPznNZ9ttCqvbeQgBs";
        const aircraftSheetGID = "705816349";
        const allDatesKey = 'allCachedDates';

        // ตรวจสอบว่ามีรายการวันที่ที่มีใน cache หรือไม่
        let cachedDates = [];
        const cachedDatesStr = localStorage.getItem(allDatesKey);
        if (cachedDatesStr) {
            try {
                cachedDates = JSON.parse(cachedDatesStr);
                console.log(`📋 พบรายการวันที่ที่มีใน cache จำนวน ${cachedDates.length} วันที่`);
            } catch (e) {
                console.error("❌ ไม่สามารถแปลงข้อมูลรายการวันที่ได้:", e);
            }
        }

        // URL สำหรับดึงข้อมูลทั้งหมด
        const aircraftURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${aircraftSheetGID}`;

        // ดึงข้อมูลทั้งหมด
        console.log("📡 กำลังดึงข้อมูลวันที่ทั้งหมดจาก Google Sheets...");
        const response = await fetch(aircraftURL, {
            cache: 'no-store', // ไม่ใช้ cache ของ browser
            headers: { 'Cache-Control': 'no-cache' }
        });
        const text = await response.text();
        const json = JSON.parse(text.substring(47, text.length - 2));

        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (json && json.table && json.table.rows && json.table.rows.length > 0) {
            console.log(`📊 ดึงข้อมูลจาก Google Sheets สำเร็จ จำนวน ${json.table.rows.length} แถว`);

            // รายการวันที่ที่พบ
            const foundDates = [];
            const datesToFetch = [];

            // วนลูปตรวจสอบทุกแถว
            for (let i = 0; i < json.table.rows.length; i++) {
                const row = json.table.rows[i];

                // ตรวจสอบว่ามีข้อมูลในคอลัมน์ A (วันที่) หรือไม่
                if (row.c && row.c[0] && row.c[0].v) {
                    // ดึงค่าวันที่จากคอลัมน์ A
                    let rowDate = row.c[0].v;
                    let formattedDate = "";

                    // แปลงวันที่ให้เป็นรูปแบบ YYYY-MM-DD
                    if (rowDate instanceof Date) {
                        const year = rowDate.getFullYear();
                        const month = String(rowDate.getMonth() + 1).padStart(2, '0');
                        const day = String(rowDate.getDate()).padStart(2, '0');
                        formattedDate = `${year}-${month}-${day}`;
                    } else if (typeof rowDate === 'string') {
                        // แปลงรูปแบบวันที่ต่างๆ เป็น YYYY-MM-DD
                        if (rowDate.includes('/')) {
                            const parts = rowDate.split('/');
                            if (parts.length === 3) {
                                const day = parts[0].padStart(2, '0');
                                const month = parts[1].padStart(2, '0');
                                let year = parts[2];
                                if (year.length === 2) year = `20${year}`;
                                formattedDate = `${year}-${month}-${day}`;
                            }
                        } else if (rowDate.includes('-')) {
                            const parts = rowDate.split('-');
                            if (parts.length === 3) {
                                if (parts[0].length === 4) {
                                    // เป็นรูปแบบ YYYY-MM-DD อยู่แล้ว
                                    formattedDate = rowDate;
                                } else {
                                    // อาจเป็นรูปแบบ DD-MM-YYYY
                                    const day = parts[0].padStart(2, '0');
                                    const month = parts[1].padStart(2, '0');
                                    let year = parts[2];
                                    if (year.length === 2) year = `20${year}`;
                                    formattedDate = `${year}-${month}-${day}`;
                                }
                            }
                        }
                    }

                    // ถ้าสามารถแปลงวันที่ได้ และยังไม่มีในรายการ
                    if (formattedDate && !foundDates.includes(formattedDate)) {
                        foundDates.push(formattedDate);
                    }
                }
            }

            // อัปเดต cache
            localStorage.setItem(allDatesKey, JSON.stringify(foundDates));
            console.log(`✅ อัปเดต cache สำเร็จ: ${foundDates.length} วันที่`);
        } else {
            console.warn("⚠️ ไม่พบข้อมูลใน Google Sheets");
        }
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
    }
}

// เรียกใช้ฟังก์ชัน
prefetchAllDates();
const aircraftImages = {
    "SKA-350": "https://www.royalrain.go.th/royalrain/IMG/content/archive/1_SuperKingAir350(SKA350).jpg",
    "CN-235": "https://www.royalrain.go.th/royalrain/IMG/content/archive/2_CN_235-220.jpg",
    "NC 212I": "https://www.royalrain.go.th/royalrain/IMG/content/archive/3_Casa_C212_NC212i.jpg",
    "CASA-400": "https://www.royalrain.go.th/royalrain/IMG/content/archive/3_Casa_C212_NC212i.jpg",
    "CASA-300": "https://www.royalrain.go.th/royalrain/IMG/content/archive/3_Casa_C212_NC212i.jpg",
    "CASA-200": "https://www.royalrain.go.th/royalrain/IMG/content/archive/3_Casa_C212_NC212i.jpg",
    "CARAVAN": "https://www.royalrain.go.th/royalrain/IMG/content/archive/4_Grand_Caravan_Caravan_Cessna_C%E0%B9%92%E0%B9%90%E0%B9%98B.jpg",
    "BELL 412EP": "https://www.royalrain.go.th/royalrain/IMG/content/archive/5_BELL_412EP.jpg",
    "BELL 407GXP": "https://www.royalrain.go.th/royalrain/IMG/content/archive/6_BELL_%E0%B9%94%E0%B9%90%E0%B9%97.jpg",
    "BELL 407": "https://www.royalrain.go.th/royalrain/IMG/content/archive/6_BELL_%E0%B9%94%E0%B9%90%E0%B9%97.jpg",
    "AS350B2": "https://www.royalrain.go.th/royalrain/IMG/content/archive/7_AS%20350_B2_ECUREUIL%20.jpg",
    "BELL 206B": "https://www.royalrain.go.th/royalrain/IMG/content/archive/8_BELL_%E0%B9%92%E0%B9%90%E0%B9%96B.jpg",
    "H130T2": "https://it.royalrain.go.th/aircraft_services/uploads/aircraft/60a15b7d97a3c9e82ff3b1fb89bc49e5.png"
};


// ฟังก์ชันที่ใช้ตัด :00 ออกจากข้อมูล
function simplifyTime(timeString) {
    if (timeString && timeString.includes(":00")) {
        return timeString.slice(0, -3);
    }
    return timeString;
}

// ฟังก์ชันตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
function checkIsMobile() {
    return window.innerWidth <= 768;
}

// ฟังก์ชันสำหรับการแสดงรายการเครื่องบิน (ส่วนที่ 2)
function generateAircraftListPart2(filteredFlights = flightData) {
    // ตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
    const isMobile = checkIsMobile();
    
    // ตัวแปรสำหรับนับจำนวนเครื่องบินที่พร้อมใช้งานและไม่พร้อมใช้งาน
    let availableCount = 0;
    let unavailableCount = 0;
    
    // ดึง element ของ listContainer
    const listContainer = document.getElementById('aircraftList');

    // สร้างและเพิ่มรายการเครื่องบินพร้อม animation
    filteredFlights.forEach((flight, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add("aircraft-item");

        // เพิ่ม animation delay ตามลำดับ
        listItem.style.opacity = "0";
        listItem.style.transform = "translateX(-20px)";
        listItem.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        listItem.style.transitionDelay = `${index * 0.03}s`; // ลดเวลา delay ลงเพื่อให้แสดงเร็วขึ้น

        // กำหนดสัญลักษณ์สถานะ (สีเขียว/แดง)
        const statusIcon = document.createElement('span');
        statusIcon.classList.add("status-icon");

        // ตรวจสอบสถานะและกำหนดไอคอนที่เหมาะสม
        if (flight.status && typeof flight.status === 'string' && flight.status.toLowerCase() === "yes") {
            statusIcon.classList.add("green");
            statusIcon.setAttribute("title", "พร้อมใช้งาน");
            // ไม่ใส่เครื่องหมายถูก
            availableCount++;
        } else {
            statusIcon.classList.add("red");
            statusIcon.setAttribute("title", "ไม่พร้อมใช้งาน");
            // ไม่ใส่เครื่องหมายกากบาท
            unavailableCount++;
        }

        // สร้างข้อความแสดงชื่อและหมายเลขเครื่องบิน
        const nameSpan = document.createElement('span');
        nameSpan.classList.add("aircraft-name");

        // คำนวณเปอร์เซ็นต์ครบซ่อม (ถ้ามีข้อมูล)
        let maintenancePercentage = 0;
        if (flight.aCheck && flight.aCheckLimit) {
            maintenancePercentage = Math.round((flight.aCheck / flight.aCheckLimit) * 100);
            if (maintenancePercentage > 100) maintenancePercentage = 100;
        }

        // กำหนดสีของ progress bar ตามเปอร์เซ็นต์
        let progressColor = 'var(--success-color)';
        if (maintenancePercentage > 90) {
            progressColor = 'var(--danger-color)';
        } else if (maintenancePercentage > 70) {
            progressColor = 'var(--warning-color)';
        }

        // กำหนดข้อความชื่อและหมายเลขเครื่องบินโดยตรง (ไม่แยกองค์ประกอบ)
        // แสดงเฉพาะแบบและหมายเลขเครื่องสำหรับทั้งเครื่องบินและเฮลิคอปเตอร์
        nameSpan.textContent = `${flight.name} ${flight.aircraftNumber}`;

        if (isMobile) {
            // ปรับขนาดรายการให้เล็กลงสำหรับมือถือ
            listItem.style.padding = '10px 12px';
            listItem.style.marginBottom = '6px';
            listItem.style.fontSize = '14px';
            listItem.style.height = 'auto';
            listItem.style.minHeight = '24px';
            listItem.style.display = 'flex';
            listItem.style.alignItems = 'flex-start';
        }

        // เพิ่มองค์ประกอบเข้าไปในรายการ
        listItem.appendChild(statusIcon);
        listItem.appendChild(nameSpan);

        // เพิ่ม event listener สำหรับการคลิก
        listItem.addEventListener("click", () => {
            // ลบคลาส active จากทุกรายการ
            document.querySelectorAll('.aircraft-item').forEach(item => {
                item.classList.remove('active');
            });

            // เพิ่มคลาส active ให้กับรายการที่คลิก
            listItem.classList.add('active');

            // ตรวจสอบว่ามีข้อมูลเครื่องบินหรือไม่
            if (!flight) {
                console.error("ไม่พบข้อมูลเครื่องบิน");
                return;
            }

            // อัปเดต sidebar และเลื่อนแผนที่ไปยังตำแหน่งของเครื่องบิน
            try {
                console.log("กำลังอัปเดต sidebar สำหรับเครื่องบิน:", flight.name, flight.aircraftNumber);

                // เรียกใช้ฟังก์ชัน updateSidebar โดยตรง
                window.updateSidebar(flight);

                // ตรวจสอบว่ามีพิกัดหรือไม่
                if (flight.latitude && flight.longitude && typeof map !== 'undefined' && map) {
                    // เพิ่ม animation เมื่อเลื่อนไปยังตำแหน่งบนแผนที่
                    map.flyTo([flight.latitude, flight.longitude], 8, {
                        duration: 1.5,
                        easeLinearity: 0.25
                    });
                } else {
                    console.warn("ไม่พบพิกัดของเครื่องบินหรือแผนที่ไม่พร้อมใช้งาน");
                }
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการอัปเดต sidebar:", error);
                // แสดงข้อผิดพลาดในรายละเอียด
                console.error("รายละเอียดข้อผิดพลาด:", error.message);
                console.error("Stack trace:", error.stack);
            }

            // ถ้าเป็นมือถือ ให้ปิดรายการหลังจากคลิก
            if (checkIsMobile()) {
                const aircraftListWrapper = document.getElementById('aircraftListWrapper');
                const mobileOverlay = document.getElementById('mobileOverlay');
                const mobileListToggle = document.getElementById('mobileListToggle');

                if (aircraftListWrapper) {
                    aircraftListWrapper.classList.remove('expanded');
                    aircraftListWrapper.classList.add('collapsed');
                }

                if (mobileOverlay) {
                    mobileOverlay.classList.remove('active');
                }

                if (mobileListToggle) {
                    mobileListToggle.innerHTML = '<i class="fas fa-list"></i> แสดงรายการ';
                }

                // อนุญาตให้เลื่อนหน้าจอได้อีกครั้ง
                document.body.style.overflow = '';
            }
        });

        // เพิ่มรายการเข้าไปใน listContainer
        listContainer.appendChild(listItem);

        // ทำให้รายการปรากฏด้วย animation
        setTimeout(() => {
            listItem.style.opacity = "1";
            listItem.style.transform = "translateX(0)";
        }, 10);
    });

    // อัปเดตสรุปจำนวนเครื่องบิน
    updateStatusSummary(availableCount, unavailableCount);

    // ตรวจสอบว่าเป็นโหมดมือถือหรือไม่
    if (checkIsMobile()) {
        // ปรับความสูงของรายการให้เหมาะสม
        listContainer.style.maxHeight = '350px';
        listContainer.style.overflowY = 'auto';
    }
}

// This duplicate function implementation has been removed to fix the syntax error




async function fetchFlightData(selectedDate = null, silentMode = false) {
    const sheetID = "1_M74Pe_4uul0fkcEea8AMxQIMcPznNZ9ttCqvbeQgBs";
    const aircraftSheetGID = "705816349";

    // สร้าง URL พร้อมพารามิเตอร์วันที่ (ถ้ามี)
    let aircraftURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${aircraftSheetGID}`;

    // เพิ่มพารามิเตอร์วันที่ถ้ามีการระบุ
    if (selectedDate) {
        aircraftURL += `&date=${selectedDate}`;
        if (!silentMode) {
            console.log(`📅 กำลังโหลดข้อมูลสำหรับวันที่: ${selectedDate}`);
        } else {
            console.log(`📅 กำลังโหลดข้อมูลสำหรับวันที่: ${selectedDate} (โหมดเงียบ)`);
        }
    }

    // กำหนดเวลาหมดอายุของข้อมูล (1 วัน)
    const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 1 วัน เป็นมิลลิวินาที

    // สร้างคีย์ cache ที่รวมวันที่ที่เลือก
    const cacheKey = selectedDate ? `flightDataCache_${selectedDate}` : 'flightDataCache';
    const timestampKey = selectedDate ? `flightDataTimestamp_${selectedDate}` : 'flightDataTimestamp';
    const allDatesKey = 'allCachedDates'; // คีย์สำหรับเก็บรายการวันที่ทั้งหมดที่มีใน cache

    // ตรวจสอบว่ามีข้อมูลใน localStorage หรือไม่
    let cachedData;
    let cachedTimestamp;
    
    try {
        cachedData = localStorage.getItem(cacheKey);
        cachedTimestamp = localStorage.getItem(timestampKey);
    } catch (e) {
        console.error("❌ เกิดข้อผิดพลาดในการอ่านข้อมูลจาก localStorage:", e);
        cachedData = null;
        cachedTimestamp = null;
    }
    
    const currentTime = new Date().getTime();

    // ฟังก์ชันสำหรับเพิ่มวันที่ลงในรายการวันที่ที่มีใน cache
    window.addDateToCache = function(date) {
        if (!date) return;
        
        // ตรวจสอบว่ามีข้อมูลจริงหรือไม่
        const cacheKey = `flightDataCache_${date}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        // ถ้าไม่มีข้อมูลจริง ไม่ต้องเพิ่มวันที่ลงในรายการ
        if (!cachedData) {
            console.log(`⚠️ ไม่พบข้อมูลจริงสำหรับวันที่ ${date} จึงไม่เพิ่มลงในรายการวันที่ที่มีข้อมูล`);
            return;
        }
        
        // ดึงรายการวันที่ที่มีอยู่แล้ว
        let allDates = [];
        const allDatesKey = 'allCachedDates'; // ย้ายมาไว้ในฟังก์ชันเพื่อให้แน่ใจว่าใช้ค่าเดียวกัน
        const cachedDates = localStorage.getItem(allDatesKey);
        if (cachedDates) {
            try {
                allDates = JSON.parse(cachedDates);
            } catch (e) {
                console.error("❌ ไม่สามารถแปลงข้อมูลรายการวันที่ได้:", e);
                allDates = [];
            }
        }
        
        // เพิ่มวันที่ใหม่ถ้ายังไม่มีในรายการ
        if (!allDates.includes(date)) {
            allDates.push(date);
            // เรียงลำดับวันที่
            allDates.sort();
            localStorage.setItem(allDatesKey, JSON.stringify(allDates));
            console.log(`✅ เพิ่มวันที่ ${date} ลงในรายการวันที่ที่มีใน cache`);
        }
    };
    
    // ถ้ามีข้อมูลใน cache และยังไม่หมดอายุ ให้ใช้ข้อมูลจาก cache
    if (cachedData && cachedTimestamp && (currentTime - parseInt(cachedTimestamp) < CACHE_EXPIRATION)) {
        console.log(`📋 ใช้ข้อมูลจาก cache สำหรับ ${selectedDate || 'วันนี้'}...`);
        
        // ถ้าเป็นโหมดเงียบ (silent mode) ให้เก็บข้อมูลไว้ใน cache เท่านั้น ไม่ต้องอัปเดต UI
        if (silentMode) {
            console.log(`🔕 โหมดเงียบ: ข้อมูลสำหรับวันที่ ${selectedDate || 'วันนี้'} มีอยู่ใน cache แล้ว`);
            return;
        }
        
        try {
            flightData.length = 0;
            const parsedData = JSON.parse(cachedData);
            
            // ตรวจสอบว่าข้อมูลที่ได้จาก cache เป็นอาร์เรย์หรือไม่
            if (Array.isArray(parsedData)) {
                parsedData.forEach(item => flightData.push(item));
                console.log("✅ โหลดข้อมูลจาก cache สำเร็จ:", flightData.length, "รายการ");
                
                // เพิ่มวันที่ลงในรายการวันที่ที่มีใน cache
                if (selectedDate && typeof window.addDateToCache === 'function') {
                    window.addDateToCache(selectedDate);
                }
                
                generateAircraftList();
                
                // โหลดข้อมูลใหม่ในพื้นหลังเพื่ออัปเดต cache แต่ไม่ต้องทำทันที
                // ใช้ requestIdleCallback ถ้ามี หรือ setTimeout ถ้าไม่มี
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(() => {
                        refreshDataInBackground();
                    }, { timeout: 5000 }); // timeout 5 วินาที
                } else {
                    setTimeout(() => {
                        refreshDataInBackground();
                    }, 3000); // รอนานขึ้นเป็น 3 วินาที
                }
                
                return;
            } else {
                console.warn("⚠️ ข้อมูลใน cache ไม่ใช่อาร์เรย์ จะโหลดข้อมูลใหม่แทน");
                // ลบข้อมูล cache ที่ไม่ถูกต้อง
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(timestampKey);
            }
        } catch (error) {
            console.error("❌ เกิดข้อผิดพลาดในการอ่านข้อมูลจาก cache:", error);
            // ลบข้อมูล cache ที่มีปัญหา
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timestampKey);
        }
    }

    // ถ้าไม่มีข้อมูลใน cache หรือข้อมูลหมดอายุแล้ว ให้โหลดข้อมูลใหม่
    try {
        await loadDataFromSheets();
        
        // ถ้าเป็นโหมดเงียบ ไม่ต้องอัปเดต UI
        if (silentMode) {
            console.log(`🔕 โหมดเงียบ: บันทึกข้อมูลสำหรับวันที่ ${selectedDate || 'วันนี้'} ลงใน cache เรียบร้อยแล้ว`);
            return;
        }
    } catch (error) {
        console.error("❌ โหลดข้อมูลไม่สำเร็จ:", error);

        // ถ้าโหลดข้อมูลใหม่ไม่สำเร็จ แต่มีข้อมูลเก่าใน cache ให้ใช้ข้อมูลเก่า
        if (cachedData) {
            // ถ้าเป็นโหมดเงียบ ไม่ต้องอัปเดต UI
            if (silentMode) {
                console.log(`🔕 โหมดเงียบ: ใช้ข้อมูลเก่าจาก cache สำหรับวันที่ ${selectedDate || 'วันนี้'} แทน`);
                return;
            }
            
            console.log("⚠️ ใช้ข้อมูลเก่าจาก cache แทน...");
            flightData.length = 0;
            const parsedData = JSON.parse(cachedData);
            parsedData.forEach(item => flightData.push(item));
            generateAircraftList();
        } else if (silentMode) {
            // ถ้าไม่มีข้อมูลใน cache และเป็นโหมดเงียบ
            console.log(`🔕 โหมดเงียบ: ไม่สามารถโหลดข้อมูลสำหรับวันที่ ${selectedDate || 'วันนี้'} ได้`);
            return;
        }
    }

    // ฟังก์ชันโหลดข้อมูลใหม่ในพื้นหลัง
    async function refreshDataInBackground() {
        try {
            console.log("🔄 กำลังอัปเดตข้อมูลในพื้นหลัง...");
            await loadDataFromSheets();
            console.log("✅ อัปเดตข้อมูลในพื้นหลังสำเร็จ");
        } catch (error) {
            console.error("❌ อัปเดตข้อมูลในพื้นหลังไม่สำเร็จ:", error);
        }
    }

    // ฟังก์ชันโหลดข้อมูลจาก Google Sheets
    async function loadDataFromSheets() {
        console.log("📡 กำลังโหลดข้อมูลจาก Google Sheets...");
    
        // ใช้ fetch options เพื่อไม่ให้ใช้ cache ของ browser
        const fetchOptions = {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        };
        
        const response = await fetch(aircraftURL, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        
        // ตรวจสอบว่าข้อมูลที่ได้รับมีความยาวเพียงพอ
        if (!text || text.length < 50) {
            throw new Error("ข้อมูลที่ได้รับจาก Google Sheets ไม่ถูกต้อง");
        }
        
        try {
            const json = JSON.parse(text.substring(47, text.length - 2));
            
            // ตรวจสอบว่า JSON มีโครงสร้างที่ถูกต้อง
            if (!json || !json.table || !json.table.rows) {
                throw new Error("โครงสร้าง JSON ไม่ถูกต้อง");
            }
            
            flightData.length = 0;

        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (json && json.table && json.table.rows && json.table.rows.length > 0) {
            console.log(`📊 ดึงข้อมูลจาก Google Sheets สำเร็จ จำนวน ${json.table.rows.length} แถว`);

            // ถ้ามีการระบุวันที่ ให้หาแถวที่มีวันที่ตรงกับที่เลือก
            if (selectedDate) {
                console.log(`🔍 กำลังค้นหาข้อมูลสำหรับวันที่: ${selectedDate}`);

                // วนลูปตรวจสอบทุกแถว
                let foundRow = null;
                for (let i = 0; i < json.table.rows.length; i++) {
                    const row = json.table.rows[i];

                    // ตรวจสอบว่ามีข้อมูลในคอลัมน์ A (วันที่) หรือไม่
                    if (row.c && row.c[0] && row.c[0].v) {
                        // ดึงค่าวันที่จากคอลัมน์ A
                        let rowDate = row.c[0].v;
                        let originalRowDate = rowDate; // เก็บค่าดั้งเดิมไว้เพื่อแสดงในการเปรียบเทียบ

                        console.log(`ตรวจสอบแถวที่ ${i+1}, วันที่ดิบจากคอลัมน์ A: ${rowDate} (ประเภท: ${typeof rowDate})`);

                        // แปลงวันที่ให้เป็นรูปแบบ YYYY-MM-DD
                        if (rowDate instanceof Date) {
                            // ถ้าเป็น Date object
                            console.log(`  - พบค่าเป็น Date object: ${rowDate}`);

                            // แปลงเป็นรูปแบบ YYYY-MM-DD
                            const year = rowDate.getFullYear();
                            const month = String(rowDate.getMonth() + 1).padStart(2, '0'); // เดือนใน JavaScript เริ่มจาก 0
                            const day = String(rowDate.getDate()).padStart(2, '0');

                            rowDate = `${year}-${month}-${day}`;
                            console.log(`  - แปลงจาก Date object เป็น: ${rowDate}`);
                        } else if (typeof rowDate === 'string' && rowDate.includes('Date(')) {
                            // ถ้าเป็นสตริงในรูปแบบ "Date(2025,3,5,0,56,41)"
                            console.log(`  - พบค่าเป็นสตริงในรูปแบบ Date(): ${rowDate}`);

                            try {
                                // แยกส่วนประกอบของวันที่
                                const dateStr = rowDate.replace('Date(', '').replace(')', '');
                                const dateParts = dateStr.split(',').map(part => part.trim());

                                if (dateParts.length >= 3) {
                                    // ดึงค่าปี เดือน วัน
                                    let year = parseInt(dateParts[0]);
                                    let month = parseInt(dateParts[1]) + 1; // เดือนใน JavaScript เริ่มจาก 0
                                    let day = parseInt(dateParts[2]);

                                    // ตรวจสอบความถูกต้องของค่า
                                    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                                        // แปลงเป็นรูปแบบ YYYY-MM-DD
                                        month = String(month).padStart(2, '0');
                                        day = String(day).padStart(2, '0');

                                        const oldFormat = rowDate;
                                        rowDate = `${year}-${month}-${day}`;
                                        console.log(`  - แปลงจาก ${oldFormat} เป็น ${rowDate}`);
                                    }
                                }
                            } catch (error) {
                                console.error(`  - เกิดข้อผิดพลาดในการแปลง Date string: ${error}`);
                            }
                        } else if (typeof rowDate === 'string') {
                            console.log(`  - พบค่าเป็นสตริง: "${rowDate}"`);

                            // ตรวจสอบรูปแบบ "DD/MM/YYYY, HH:MM:SS"
                            if (rowDate.includes(',')) {
                                // แยกส่วนวันที่และเวลา (เอาเฉพาะส่วนวันที่)
                                const parts = rowDate.split(',');
                                const datePart = parts[0].trim();
                                console.log(`  - แยกเฉพาะส่วนวันที่: "${datePart}"`);

                                // ใช้เฉพาะส่วนวันที่
                                rowDate = datePart;

                                // แปลงส่วนวันที่
                                if (datePart.includes('/')) {
                                    const dateParts = datePart.split('/');

                                    if (dateParts.length === 3) {
                                        // สันนิษฐานว่าเป็นรูปแบบ DD/MM/YYYY
                                        const day = dateParts[0].padStart(2, '0');
                                        const month = dateParts[1].padStart(2, '0');
                                        let year = dateParts[2];

                                        // ตรวจสอบว่าปีเป็น 2 หลักหรือ 4 หลัก
                                        if (year.length === 2) {
                                            year = `20${year}`; // สมมติว่าเป็นปี 20xx
                                        }

                                        const oldFormat = datePart;
                                        rowDate = `${year}-${month}-${day}`;
                                        console.log(`  - แปลงจาก ${oldFormat} เป็น ${rowDate} (เฉพาะส่วนวันที่)`);
                                    }
                                }
                            }
                            // ตรวจสอบรูปแบบ DD/MM/YYYY
                            else if (rowDate.includes('/')) {
                                const parts = rowDate.split('/');
                                console.log(`  - พบรูปแบบที่มี / แยกเป็นส่วน: ${parts.join(', ')}`);

                                if (parts.length === 3) {
                                    // สันนิษฐานว่าเป็นรูปแบบ DD/MM/YYYY
                                    const day = parts[0].padStart(2, '0');
                                    const month = parts[1].padStart(2, '0');
                                    let year = parts[2];

                                    // ตรวจสอบว่าปีเป็น 2 หลักหรือ 4 หลัก
                                    if (year.length === 2) {
                                        year = `20${year}`; // สมมติว่าเป็นปี 20xx
                                    }

                                    const oldFormat = rowDate;
                                    rowDate = `${year}-${month}-${day}`;
                                    console.log(`  - แปลงจาก ${oldFormat} เป็น ${rowDate}`);
                                }
                            } else if (rowDate.includes('-')) {
                                console.log(`  - พบรูปแบบที่มี - อยู่แล้ว: ${rowDate}`);

                                // ตรวจสอบว่าเป็นรูปแบบ YYYY-MM-DD หรือไม่
                                const parts = rowDate.split('-');
                                if (parts.length === 3) {
                                    // ตรวจสอบว่าปีอยู่ตำแหน่งแรกหรือไม่
                                    if (parts[0].length === 4) {
                                        // เป็นรูปแบบ YYYY-MM-DD อยู่แล้ว
                                        console.log(`  - เป็นรูปแบบ YYYY-MM-DD อยู่แล้ว`);
                                    } else {
                                        // อาจเป็นรูปแบบ DD-MM-YYYY
                                        const day = parts[0].padStart(2, '0');
                                        const month = parts[1].padStart(2, '0');
                                        let year = parts[2];

                                        // ตรวจสอบว่าปีเป็น 2 หลักหรือ 4 หลัก
                                        if (year.length === 2) {
                                            year = `20${year}`; // สมมติว่าเป็นปี 20xx
                                        }

                                        const oldFormat = rowDate;
                                        rowDate = `${year}-${month}-${day}`;
                                        console.log(`  - แปลงจาก ${oldFormat} (DD-MM-YYYY) เป็น ${rowDate} (YYYY-MM-DD)`);
                                    }
                                }
                            }
                        } else if (typeof rowDate === 'number') {
                            // ถ้าเป็นตัวเลข (อาจเป็น timestamp หรือ serial date ของ Excel)
                            console.log(`  - พบค่าเป็นตัวเลข: ${rowDate}`);

                            // ถ้าเป็น Excel serial date (จำนวนวันนับจาก 1/1/1900)
                            // แปลงเป็น JavaScript Date
                            const excelEpoch = new Date(1899, 11, 30); // 30 ธันวาคม 1899
                            const jsDate = new Date(excelEpoch);
                            jsDate.setDate(excelEpoch.getDate() + rowDate);

                            // แปลงเป็นรูปแบบ YYYY-MM-DD
                            const year = jsDate.getFullYear();
                            const month = String(jsDate.getMonth() + 1).padStart(2, '0');
                            const day = String(jsDate.getDate()).padStart(2, '0');
                            rowDate = `${year}-${month}-${day}`;
                            console.log(`  - แปลงจากตัวเลข Excel serial date เป็น: ${rowDate}`);
                        }

                        // แสดงข้อมูลเปรียบเทียบ
                        console.log(`🔍 เปรียบเทียบ:`);
                        console.log(`  - ค่าดั้งเดิมในคอลัมน์ A: "${originalRowDate}"`);
                        console.log(`  - ค่าที่แปลงแล้ว (เฉพาะวันที่): "${rowDate}"`);
                        console.log(`  - ค่าจากปฏิทิน: "${selectedDate}"`);

                        // ตรวจสอบว่าวันที่ตรงกันหรือไม่ด้วยหลายวิธี
                        if (rowDate === selectedDate) {
                            console.log(`✅ พบข้อมูลสำหรับวันที่ ${selectedDate} ที่แถวที่ ${i+1} (แมทช์แบบตรงๆ)`);
                            foundRow = row;
                            break;
                        }
                        
                        // ตรวจสอบแบบแปลงเป็น Date object และเปรียบเทียบ
                        try {
                            // แปลงวันที่ทั้งสองเป็น Date object
                            const rowDateObj = new Date(rowDate);
                            const selectedDateObj = new Date(selectedDate);
                            
                            // ตรวจสอบว่าเป็น Date object ที่ถูกต้องหรือไม่
                            if (!isNaN(rowDateObj.getTime()) && !isNaN(selectedDateObj.getTime())) {
                                // เปรียบเทียบเฉพาะส่วนวันที่ (ไม่รวมเวลา)
                                if (rowDateObj.getFullYear() === selectedDateObj.getFullYear() && 
                                    rowDateObj.getMonth() === selectedDateObj.getMonth() && 
                                    rowDateObj.getDate() === selectedDateObj.getDate()) {
                                    
                                    console.log(`✅ พบข้อมูลสำหรับวันที่ ${selectedDate} ที่แถวที่ ${i+1} (แมทช์แบบ Date object)`);
                                    foundRow = row;
                                    break;
                                }
                            }
                        } catch (e) {
                            console.log(`⚠️ ไม่สามารถเปรียบเทียบวันที่แบบ Date object ได้: ${e.message}`);
                        }
                        
                        // ตรวจสอบแบบแปลงเป็นรูปแบบอื่นๆ
                        try {
                            // แปลงวันที่เป็นรูปแบบ DD/MM/YYYY
                            const rowDateParts = rowDate.split('-');
                            const selectedDateParts = selectedDate.split('-');
                            
                            if (rowDateParts.length === 3 && selectedDateParts.length === 3) {
                                const rowDateDDMMYYYY = `${rowDateParts[2]}/${rowDateParts[1]}/${rowDateParts[0]}`;
                                const selectedDateDDMMYYYY = `${selectedDateParts[2]}/${selectedDateParts[1]}/${selectedDateParts[0]}`;
                                
                                if (rowDateDDMMYYYY === selectedDateDDMMYYYY) {
                                    console.log(`✅ พบข้อมูลสำหรับวันที่ ${selectedDate} ที่แถวที่ ${i+1} (แมทช์แบบ DD/MM/YYYY)`);
                                    foundRow = row;
                                    break;
                                }
                            }
                        } catch (e) {
                            console.log(`⚠️ ไม่สามารถเปรียบเทียบวันที่แบบ DD/MM/YYYY ได้: ${e.message}`);
                        }
                    }
                }

                // ถ้าพบแถวที่มีวันที่ตรงกับที่เลือก
                if (foundRow) {
                    // รีเซ็ตตัวนับตำแหน่ง
                    for (let key in positionCounts) {
                        delete positionCounts[key];
                    }

                    // ประมวลผลข้อมูลแถวที่พบ
                    processLastRowData(foundRow);
                } else {
                    console.warn(`⚠️ ไม่พบข้อมูลสำหรับวันที่ ${selectedDate}`);
                    alert(`ไม่พบข้อมูลสำหรับวันที่ ${selectedDate}`);
                }
            } else {
                // ถ้าไม่มีการระบุวันที่ ให้ใช้แถวสุดท้าย (ข้อมูลล่าสุด)
                const lastRow = json.table.rows[json.table.rows.length - 1];
                console.log(`📊 ใช้ข้อมูลล่าสุดจากแถวสุดท้าย`);

                // รีเซ็ตตัวนับตำแหน่ง
                for (let key in positionCounts) {
                    delete positionCounts[key];
                }

                // ประมวลผลข้อมูลแถวสุดท้าย
                processLastRowData(lastRow);
            }
        }

        // บันทึกข้อมูลลงใน localStorage
        localStorage.setItem(cacheKey, JSON.stringify(flightData));
        localStorage.setItem(timestampKey, currentTime.toString());
        
        // เพิ่มวันที่ลงในรายการวันที่ที่มีใน cache
        if (selectedDate) {
            addDateToCache(selectedDate);
        }

        console.log("✅ ข้อมูลอัปเดตแล้ว:", flightData.length, "รายการ");
        
        // ถ้าไม่ใช่โหมดเงียบ ให้อัปเดต UI
        if (!silentMode) {
            generateAircraftList();
        }
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการประมวลผลข้อมูล JSON:", error);
        throw error; // ส่งต่อข้อผิดพลาดเพื่อให้ catch ด้านนอกจัดการ
    }
}

function processLastRowData(row) {
    try {
        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (!row.c) {
            console.error("❌ ข้อมูลแถวสุดท้ายไม่มีคอลัมน์");
            return;
        }

            // ตรวจสอบว่ามีข้อมูล JSON ในคอลัมน์ B หรือไม่
            if (!row.c[1]?.v) {
                console.error("❌ ข้อมูลแถวสุดท้ายไม่มีข้อมูล JSON ในคอลัมน์ B");
                return;
            }

            console.log("📄 ข้อมูล JSON จากคอลัมน์ B:", row.c[1].v);

            // พยายามแปลงข้อมูล JSON จากคอลัมน์ B
            let jsonData;
            try {
                jsonData = JSON.parse(row.c[1].v);
                console.log("✅ แปลงข้อมูล JSON สำเร็จ");
            } catch (jsonError) {
                console.error("❌ ไม่สามารถแปลงข้อมูล JSON ได้:", jsonError);
                console.error("ข้อมูลที่พยายามแปลง:", row.c[1].v);
                return;
            }

            // ตรวจสอบว่า JSON มีข้อมูลที่จำเป็นหรือไม่
            if (!jsonData || typeof jsonData !== 'object') {
                console.error("❌ ข้อมูล JSON ไม่ถูกต้อง");
                return;
            }

            console.log("📊 โครงสร้างข้อมูล JSON:", Object.keys(jsonData));

            // ตรวจสอบว่ามีข้อมูล Sheet1 หรือไม่
            if (jsonData.ข้อมูลSheet1 && Array.isArray(jsonData.ข้อมูลSheet1)) {
                console.log("✅ พบข้อมูล Sheet1 จำนวน", jsonData.ข้อมูลSheet1.length, "รายการ");

                // ประมวลผลข้อมูลจาก Sheet1
                processSheet1Data(jsonData.ข้อมูลSheet1);
            } else {
                console.warn("⚠️ ไม่พบข้อมูล Sheet1 หรือข้อมูลไม่ใช่อาร์เรย์");
            }

            // ตรวจสอบว่ามีข้อมูล Sheet2 (เฮลิคอปเตอร์) หรือไม่
            if (jsonData.ข้อมูลSheet2 && Array.isArray(jsonData.ข้อมูลSheet2)) {
                console.log("✅ พบข้อมูล Sheet2 (เฮลิคอปเตอร์) จำนวน", jsonData.ข้อมูลSheet2.length, "รายการ");

                // ประมวลผลข้อมูลจาก Sheet2
                processSheet2Data(jsonData.ข้อมูลSheet2);
            } else {
                console.warn("⚠️ ไม่พบข้อมูล Sheet2 หรือข้อมูลไม่ใช่อาร์เรย์");
            }
        } catch (error) {
            console.error("❌ เกิดข้อผิดพลาดในการประมวลผลข้อมูลแถวสุดท้าย:", error);
        }
    }

    // ฟังก์ชันประมวลผลข้อมูลจาก Sheet1
    function processSheet1Data(aircraftArray) {
        if (!aircraftArray || !Array.isArray(aircraftArray) || aircraftArray.length === 0) {
            console.error("❌ ข้อมูล Sheet1 ไม่ถูกต้องหรือไม่มีข้อมูล");
            return;
        }

        // ไม่ต้องกรองข้อมูลตามวันที่อีก เพราะได้กรองจากแถวที่มีวันที่ตรงกับที่เลือกแล้ว
        let filteredArray = aircraftArray;

        console.log("🔄 เริ่มประมวลผลข้อมูลเครื่องบินจำนวน", filteredArray.length, "รายการ");

        // วนลูปเพื่อเพิ่มข้อมูลเครื่องบินแต่ละลำ
        filteredArray.forEach((aircraft, index) => {
            try {
                // ตรวจสอบว่ามีข้อมูลพื้นฐานที่จำเป็นหรือไม่
                if ((!aircraft["แบบเครื่องบิน"] && !aircraft["หมายเลข"]) &&
                    (!aircraft["แบบเครื่องบิน"] && !aircraft["เครื่องบิน"])) {
                    console.warn(`⚠️ ข้อมูลเครื่องบินลำดับที่ ${index + 1} ไม่มีแบบหรือหมายเลข`);
                    return; // ข้ามข้อมูลนี้
                }

                // ดึงข้อมูลจาก JSON ตามโครงสร้างที่กำหนด
                const name = aircraft["แบบเครื่องบิน"] || "";

                // ตรวจสอบว่าเป็นเฮลิคอปเตอร์หรือเครื่องบิน
                const isHelicopter = (name.toLowerCase().includes("helicopter") ||
                                    name.toLowerCase().includes("เฮลิคอปเตอร์") ||
                                    name.toLowerCase().includes("bell") ||
                                    name.toLowerCase().includes("as350") ||
                                    name.toLowerCase().includes("h130"));

                // ใช้ field ที่แตกต่างกันตามประเภท
                let aircraftNumber, remainingHours, engineLH, engineRH, aCheck, aCheckDue;

                if (isHelicopter) {
                    // สำหรับเฮลิคอปเตอร์
                    aircraftNumber = aircraft["หมายเลข"] || "";
                    remainingHours = aircraft["ชั่วโมง"] || "0";
                    engineLH = aircraft["ชั่วโมงเครื่องยนต์ ย1"] || "0";
                    engineRH = aircraft["ชั่วโมงเครื่องยนต์ ย2"] || "0";

                    // ตรวจสอบชั่วโมงบินคงเหลือครบซ่อมทั้ง 3 ค่า
                    const hours100 = aircraft["ชั่วโมงบินคงเหลือครบซ่อม 100"] || "0";
                    const hours150 = aircraft["ชั่วโมงบินคงเหลือครบซ่อม 150"] || "0";
                    const hours300 = aircraft["ชั่วโมงบินคงเหลือครบซ่อม 300"] || "0";

                    // เลือกค่าที่ไม่ใช่ 0 ตามลำดับความสำคัญ
                    if (hours100 !== "0") {
                        aCheck = hours100;
                        aCheckDue = "100 ชั่วโมง";
                    } else if (hours150 !== "0") {
                        aCheck = hours150;
                        aCheckDue = "150 ชั่วโมง";
                    } else if (hours300 !== "0") {
                        aCheck = hours300;
                        aCheckDue = "300 ชั่วโมง";
                    } else {
                        aCheck = "0";
                        aCheckDue = "";
                    }
                } else {
                    // สำหรับเครื่องบิน
                    aircraftNumber = aircraft["เครื่องบิน"] || "";
                    
                    // ตรวจสอบชื่อคอลัมน์ที่ถูกต้อง (อาจมีช่องว่างท้ายชื่อ)
                    const keys = Object.keys(aircraft);
                    const flightHoursKey = keys.find(key => key.includes("ชั่วโมงเครื่องบิน"));
                    const aCheckKey = keys.find(key => key.includes("A cHEcK"));

                    // อ่านค่าจากคอลัมน์ที่พบ
                    const rawFlightHours = flightHoursKey ? aircraft[flightHoursKey] : "";
                    const rawACheck = aCheckKey ? aircraft[aCheckKey] : "";
                    
                    // ตรวจสอบว่าเป็นเครื่องบิน SKA หรือไม่
                    const isSKA = name.toUpperCase().includes("SKA") || name.toUpperCase().includes("SUPER KING AIR");
                    
                    // เก็บค่าชั่วโมงเครื่องบินและ A CHECK
                    if (isSKA) {
                        // สำหรับ SKA ให้เก็บค่าดิบไว้ใช้ในการแสดงผล
                        console.log(`พบเครื่องบิน SKA: ${name} หมายเลข ${aircraftNumber}`);
                        
                        // เก็บค่าดิบไว้ใช้ในการแสดงผล
                        remainingHours = rawFlightHours || "";
                        aCheck = rawACheck || "";
                    } else {
                        // สำหรับเครื่องบินทั่วไป
                        remainingHours = rawFlightHours || "";
                        aCheck = rawACheck || "";
                    }
                    
                    // แสดงค่าดิบที่ได้รับมาเพื่อตรวจสอบ
                    console.log(`ข้อมูลเครื่องบินหมายเลข ${aircraftNumber}:`, {
                        "ประเภท": isSKA ? "SKA (XX.X)" : "ทั่วไป",
                        "ชั่วโมงเครื่องบิน (ดิบ)": rawFlightHours,
                        "ชั่วโมงเครื่องบิน (แปลงแล้ว)": remainingHours,
                        "A CHECK (ดิบ)": rawACheck,
                        "A CHECK (แปลงแล้ว)": aCheck
                    });

                    // คำนวณค่าครบซ่อม (ชั่วโมงเครื่องบิน - A CHECK)
                    if (rawFlightHours && rawACheck) {
                        try {
                            // แปลงเวลาในรูปแบบ HH:MM เป็นชั่วโมงทศนิยม
                            const flightHoursValue = convertTimeToDecimal(rawFlightHours);
                            const aCheckValue = convertTimeToDecimal(rawACheck);

                            // คำนวณผลต่าง (A CHECK - ชั่วโมงเครื่องบิน)
                            const difference = Math.max(0, aCheckValue - flightHoursValue);

                            // แปลงกลับเป็นรูปแบบ HH:MM
                            aCheckDue = formatDecimalToTime(difference);
                        } catch (error) {
                            console.error(`❌ เกิดข้อผิดพลาดในการคำนวณค่าครบซ่อม:`, error);
                            aCheckDue = "";
                        }
                    } else {
                        aCheckDue = "";
                    }

                    // ตรวจสอบค่าเครื่องยนต์
                    engineLH = aircraft["No.1 /LH"] || "";
                    engineRH = aircraft["No.2 /RH"] || "";
                }

                // แปลงสถานะเป็น yes/no
                let status = "no";
                if (aircraft["สภาพ"]) {
                    const statusText = aircraft["สภาพ"].toString().toLowerCase();
                    status = (statusText === "yes" || statusText === "ใช้งานได้" || statusText === "พร้อม" ||
                             statusText === "ใช้งานได้" || statusText === "ปกติ" || statusText === "normal") ? "yes" : "no";
                }

                const missionBase = aircraft["ภารกิจ/ฐานที่ตั้ง"] || "กรุงเทพฯ";
                const maintenanceManager = aircraft["ผู้ควบคุมงานช่าง"] || "ไม่ระบุ";
                const note = aircraft["หมายเหตุ"] || "";

                // ประเภทเครื่องบินได้ถูกกำหนดไว้แล้วด้านบน
                const type = isHelicopter ? "helicopter" : "aircraft";

                // หาพิกัดจากฐานที่ตั้ง
                let province = extractProvince(missionBase);
                let coordinates = provinceCoordinates[province] || [13.7367, 100.5231]; // กรุงเทพฯ เป็นค่าเริ่มต้น

                // ใช้พิกัดที่มีในข้อมูล JSON ถ้ามี
                if (aircraft["latitude"] && aircraft["longitude"]) {
                    coordinates = [parseFloat(aircraft["latitude"]), parseFloat(aircraft["longitude"])];
                }

                // สร้างข้อมูลสำหรับการแสดงผล
                let flight = {
                    id: aircraftNumber,
                    name: name,
                    aircraftNumber: aircraftNumber,
                    aircraftType: name, // ใช้แบบเครื่องบินเป็นประเภท
                    status: status,
                    remainingHours: remainingHours,
                    engineLH: engineLH,
                    engineRH: engineRH,
                    missionBase: missionBase,
                    maintenanceManager: maintenanceManager,
                    note: note,
                    aCheck: aCheck,
                    aCheckDue: aCheckDue,
                    latitude: coordinates[0],
                    longitude: coordinates[1],
                    type: type
                };
                
                // เพิ่มข้อมูลดิบเพื่อการตรวจสอบ
                if (type === 'aircraft') {
                    // สำหรับเครื่องบิน
                    if (typeof rawFlightHours !== 'undefined') {
                        flight.rawFlightHours = rawFlightHours;
                    }
                    if (typeof rawACheck !== 'undefined') {
                        flight.rawACheck = rawACheck;
                    }
                } else if (type === 'helicopter') {
                    // สำหรับเฮลิคอปเตอร์
                    flight.rawFlightHours = remainingHours;
                }

                // เพิ่มข้อมูลเข้าไปในอาร์เรย์
                flightData.push(flight);

                console.log(`✅ ประมวลผลข้อมูลเครื่องบินลำดับที่ ${index + 1} สำเร็จ: ${flight.name} (${flight.aircraftNumber})`);
            } catch (error) {
                console.error(`❌ เกิดข้อผิดพลาดในการประมวลผลข้อมูลเครื่องบินลำดับที่ ${index + 1}:`, error);
            }
        });
    }

    // ฟังก์ชันประมวลผลข้อมูลจาก Sheet2 (เฮลิคอปเตอร์)
    function processSheet2Data(helicopterArray) {
        if (!helicopterArray || !Array.isArray(helicopterArray) || helicopterArray.length === 0) {
            console.error("❌ ข้อมูล Sheet2 (เฮลิคอปเตอร์) ไม่ถูกต้องหรือไม่มีข้อมูล");
            return;
        }

        console.log("🔄 เริ่มประมวลผลข้อมูลเฮลิคอปเตอร์จำนวน", helicopterArray.length, "รายการ");

        // วนลูปเพื่อเพิ่มข้อมูลเฮลิคอปเตอร์แต่ละลำ
        helicopterArray.forEach((helicopter, index) => {
            try {
                // ตรวจสอบว่ามีข้อมูลพื้นฐานที่จำเป็นหรือไม่
                if (!helicopter["แบบเครื่องบิน"] || !helicopter["หมายเลข"]) {
                    console.warn(`⚠️ ข้อมูลเฮลิคอปเตอร์ลำดับที่ ${index + 1} ไม่มีแบบหรือหมายเลข`);
                    return; // ข้ามข้อมูลนี้
                }

                // ดึงข้อมูลจาก JSON ตามโครงสร้างที่กำหนด
                const name = helicopter["แบบเครื่องบิน"] || "";
                const aircraftNumber = helicopter["หมายเลข"] || "";
                const remainingHours = helicopter["ชั่วโมง"] || "0";
                const engineLH = helicopter["ชั่วโมงเครื่องยนต์ ย1"] || "0";
                const engineRH = helicopter["ชั่วโมงเครื่องยนต์ ย2"] || "0";

                // ตรวจสอบชั่วโมงบินคงเหลือครบซ่อมทั้ง 3 ค่า
                const rawHours100 = helicopter["ชั่วโมงบินคงเหลือครบซ่อม 100"] || "_";
                const rawHours150 = helicopter["ชั่วโมงบินคงเหลือครบซ่อม 150"] || "_";
                const rawHours300 = helicopter["ชั่วโมงบินคงเหลือครบซ่อม 300"] || "_";

                console.log(`ข้อมูลชั่วโมงบินคงเหลือครบซ่อมของ ${aircraftNumber}:`, {
                    "100 ชั่วโมง": rawHours100,
                    "150 ชั่วโมง": rawHours150,
                    "300 ชั่วโมง": rawHours300
                });

                // ตรวจสอบว่าค่าใดอยู่ในรูปแบบ XX:XX
                const isValidFormat = (value) => {
                    return typeof value === 'string' &&
                           value.includes(':') &&
                           value !== '_' &&
                           value !== '-';
                };

                // เลือกค่าที่อยู่ในรูปแบบที่ถูกต้องตามลำดับความสำคัญ
                let aCheck, aCheckDue, maintenanceType;

                if (isValidFormat(rawHours100)) {
                    // ใช้ค่าดิบโดยตรงเพื่อรักษารูปแบบ XX:XX
                    aCheck = rawHours100;
                    aCheckDue = "100";
                    maintenanceType = "100";
                    console.log(`✅ ใช้ค่าชั่วโมงบินคงเหลือครบซ่อม 100: ${aCheck}`);
                } else if (isValidFormat(rawHours150)) {
                    // ใช้ค่าดิบโดยตรงเพื่อรักษารูปแบบ XX:XX
                    aCheck = rawHours150;
                    aCheckDue = "150";
                    maintenanceType = "150";
                    console.log(`✅ ใช้ค่าชั่วโมงบินคงเหลือครบซ่อม 150: ${aCheck}`);
                } else if (isValidFormat(rawHours300)) {
                    // ใช้ค่าดิบโดยตรงเพื่อรักษารูปแบบ XX:XX
                    aCheck = rawHours300;
                    aCheckDue = "300";
                    maintenanceType = "300";
                    console.log(`✅ ใช้ค่าชั่วโมงบินคงเหลือครบซ่อม 300: ${aCheck}`);
                } else {
                    aCheck = "0";
                    aCheckDue = "";
                    maintenanceType = "";
                    console.log(`⚠️ ไม่พบค่าชั่วโมงบินคงเหลือครบซ่อมที่ถูกต้อง`);
                }

                // แปลงสถานะเป็น yes/no
                let status = "no";
                if (helicopter["สภาพ"]) {
                    const statusText = helicopter["สภาพ"].toString().toLowerCase();
                    status = (statusText === "yes" || statusText === "ใช้งานได้" || statusText === "พร้อม" ||
                             statusText === "ใช้งานได้" || statusText === "ปกติ" || statusText === "normal") ? "yes" : "no";
                }

                const missionBase = helicopter["ภารกิจ/ฐานที่ตั้ง"] || "กรุงเทพฯ";
                const maintenanceManager = helicopter["ผู้ควบคุมงานช่าง"] || "ไม่ระบุ";
                const note = helicopter["หมายเหตุ"] || "";

                // หาพิกัดจากฐานที่ตั้ง
                let province = extractProvince(missionBase);
                let coordinates = provinceCoordinates[province] || [13.7367, 100.5231]; // กรุงเทพฯ เป็นค่าเริ่มต้น

                // ใช้พิกัดที่มีในข้อมูล JSON ถ้ามี
                if (helicopter["latitude"] && helicopter["longitude"]) {
                    coordinates = [parseFloat(helicopter["latitude"]), parseFloat(helicopter["longitude"])];
                }

                // สร้างข้อมูลสำหรับการแสดงผล
                let flight = {
                    id: aircraftNumber,
                    name: name,
                    aircraftNumber: aircraftNumber,
                    aircraftType: name, // ใช้แบบเครื่องบินเป็นประเภท
                    status: status,
                    remainingHours: remainingHours,
                    engineLH: engineLH,
                    engineRH: engineRH,
                    missionBase: missionBase,
                    maintenanceManager: maintenanceManager,
                    note: note,
                    aCheck: aCheck,
                    aCheckDue: aCheckDue,
                    maintenanceType: maintenanceType, // เก็บประเภทการซ่อมบำรุง (100, 150, 300)
                    latitude: coordinates[0],
                    longitude: coordinates[1],
                    type: "helicopter", // กำหนดประเภทเป็นเฮลิคอปเตอร์
                    // เก็บข้อมูลดิบของชั่วโมงบินคงเหลือครบซ่อมทั้ง 3 ค่า
                    maintenanceHours: {
                        hours100: rawHours100,
                        hours150: rawHours150,
                        hours300: rawHours300
                    }
                };

                // เพิ่มข้อมูลเข้าไปในอาร์เรย์
                flightData.push(flight);

                console.log(`✅ ประมวลผลข้อมูลเฮลิคอปเตอร์ลำดับที่ ${index + 1} สำเร็จ: ${flight.name} (${flight.aircraftNumber})`);
            } catch (error) {
                console.error(`❌ เกิดข้อผิดพลาดในการประมวลผลข้อมูลเฮลิคอปเตอร์ลำดับที่ ${index + 1}:`, error);
            }
        });

        console.log(`✅ ประมวลผลข้อมูลเฮลิคอปเตอร์ทั้งหมดสำเร็จ`);
    }
}



function formatHours(value) {
    if (!value) return "N/A";
    return value.replace(/:00$/, "");
}

// ฟังก์ชันแปลงค่าเวลาให้เป็นรูปแบบที่ถูกต้อง
function formatTime(value) {
    if (!value) return "0";

    try {
        // ถ้าเป็นตัวเลขหรือสตริงที่เป็นตัวเลข
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)) && !value.includes(':'))) {
            // แปลงเป็นตัวเลขและตรวจสอบว่าเป็นจำนวนเต็มหรือไม่
            const numValue = parseFloat(value);
            if (Number.isInteger(numValue)) {
                return `${numValue}:00`;  // เช่น 5 เป็น "5:00"
            } else {
                // แยกส่วนจำนวนเต็มและทศนิยม
                const hours = Math.floor(numValue);
                // ใช้ Math.trunc แทน Math.round เพื่อไม่ให้มีการปัดเศษ
                const minutes = Math.trunc((numValue - hours) * 60);
                return `${hours}:${minutes.toString().padStart(2, '0')}`;  // เช่น 5.5 เป็น "5:30"
            }
        }

        // ถ้าเป็นสตริงที่มีรูปแบบ "HH:MM" อยู่แล้ว
        if (typeof value === 'string' && value.includes(':')) {
            const parts = value.split(':');
            if (parts.length === 2) {
                const hours = parseInt(parts[0]);
                const minutes = parseInt(parts[1]);
                if (!isNaN(hours) && !isNaN(minutes)) {
                    // ตรวจสอบว่านาทีอยู่ในช่วง 0-59
                    if (minutes >= 0 && minutes < 60) {
                        return `${hours}:${minutes.toString().padStart(2, '0')}`;
                    } else {
                        // ถ้านาทีไม่ถูกต้อง ให้ปรับค่า
                        const extraHours = Math.floor(minutes / 60);
                        const adjustedMinutes = minutes % 60;
                        return `${hours + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`;
                    }
                }
            }
        }

        // กรณีอื่นๆ ให้คืนค่าเดิม
        return value.toString();
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในฟังก์ชัน formatTime:", error);
        return "0";
    }
}

function extractProvince(text) {
    for (let province in provinceCoordinates) {
        if (text.includes(province)) {
            return province;
        }
    }
    return "นครสวรรค์";
}

// ตัวแปรเก็บจำนวนมาร์กเกอร์ในแต่ละตำแหน่ง
const positionCounts = {};

// ฟังก์ชันเพิ่ม jitter ให้กับพิกัดเพื่อไม่ให้มาร์กเกอร์ทับกัน
function addJitter(coordinates) {
    // ตรวจสอบรูปแบบพารามิเตอร์ที่รับเข้ามา
    let lat, lng;
    
    if (Array.isArray(coordinates) && coordinates.length === 2) {
        // กรณีรับเป็น array [lat, lng]
        [lat, lng] = coordinates;
    } else {
        console.warn("พิกัดไม่ถูกต้อง ไม่สามารถเพิ่ม jitter ได้");
        return coordinates || [0, 0];
    }
    
    try {
        // ตรวจสอบว่าพิกัดเป็นตัวเลขหรือไม่
        lat = parseFloat(lat);
        lng = parseFloat(lng);

        if (isNaN(lat) || isNaN(lng)) {
            console.warn("พิกัดไม่ใช่ตัวเลข ไม่สามารถเพิ่ม jitter ได้");
            return coordinates;
        }

        // สร้างคีย์สำหรับตำแหน่งนี้ (ปัดเศษให้เหลือ 4 ตำแหน่ง)
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

        // ตรวจสอบว่ามีมาร์กเกอร์ในตำแหน่งนี้กี่ตัวแล้ว
        if (!positionCounts[key]) {
            positionCounts[key] = 0;
        }

        // เพิ่มจำนวนมาร์กเกอร์ในตำแหน่งนี้
        positionCounts[key]++;
        const count = positionCounts[key];

        // กำหนดระยะห่างระหว่างเครื่องบิน
        const offset = 0.0005 * Math.min(count, 5); // จำกัดระยะห่างสูงสุด

        // ถ้ามีมาร์กเกอร์ในตำแหน่งนี้มากกว่า 1 ตัว ให้เพิ่ม jitter
        if (count > 1) {
            // คำนวณมุมสำหรับการกระจายมาร์กเกอร์เป็นวงกลม
            const angle = (count - 2) * (Math.PI / 4); // แบ่งเป็น 8 ส่วนรอบวงกลม

            // คำนวณพิกัดใหม่
            const jitteredLat = lat + offset * Math.cos(angle);
            const jitteredLng = lng + offset * Math.sin(angle);

            return [jitteredLat, jitteredLng];
        }

        // ถ้ามีมาร์กเกอร์ในตำแหน่งนี้เพียงตัวเดียว ให้ใช้พิกัดเดิม
        return [lat, lng];
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเพิ่ม jitter:", error);
        return coordinates;
    }
}

let map;



function initMap() {
    // ตรวจสอบว่าแผนที่ถูกเริ่มต้นไปแล้วหรือไม่
    if (!map) {
        try {
            console.log("กำลังสร้างแผนที่...");

            // ตรวจสอบว่า element map มีอยู่จริงหรือไม่
            const mapElement = document.getElementById('map');
            if (!mapElement) {
                console.error("ไม่พบ element 'map'");
                return;
            }

            // ตรวจสอบว่า Leaflet ถูกโหลดหรือไม่
            if (typeof L === 'undefined') {
                console.error("ไม่พบ Leaflet library");
                // ลองโหลด Leaflet อีกครั้ง
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
                script.crossOrigin = '';
                script.onload = function() {
                    console.log("โหลด Leaflet สำเร็จ กำลังเริ่มต้นแผนที่อีกครั้ง...");
                    initMap();
                };
                document.head.appendChild(script);
                return;
            }

            // ถ้ายังไม่มีแผนที่ ให้สร้างแผนที่ใหม่
            map = L.map('map', {
                zoomControl: false  // ปิดปุ่ม zoom เริ่มต้น
            }).setView([13.7367, 100.5231], 6);

            // เพิ่ม tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);

            // เพิ่มปุ่ม zoom ในตำแหน่งที่ต้องการ
            L.control.zoom({
                position: 'bottomright'
            }).addTo(map);

            // ตรวจสอบว่าแผนที่แสดงผลถูกต้อง
            window.addEventListener('resize', function() {
                if (map) map.invalidateSize();
            });

            // บังคับให้แผนที่คำนวณขนาดใหม่
            setTimeout(function() {
                if (map) map.invalidateSize();
            }, 0);

            console.log("สร้างแผนที่สำเร็จ");
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการสร้างแผนที่:", error);
        }
    }

    // เรียกใช้ฟังก์ชันอัปเดตมาร์กเกอร์ถ้ามีข้อมูล
    if (flightData && flightData.length > 0 && typeof L !== 'undefined') {
        updateMapMarkers();
    } else {
        console.log("ยังไม่มีข้อมูลเครื่องบิน หรือ Leaflet ยังไม่พร้อม จะอัปเดตมาร์กเกอร์ภายหลัง");
    }
}

window.addEventListener('DOMContentLoaded', function () {
    // ตั้งค่าปุ่มควบคุมสำหรับมือถือ
    setupMobileControls();

    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function () {
            // เคลียร์ค่าที่กรอกในช่องค้นหา
            document.getElementById('missionBaseFilter').value = "";

            // ลบมาร์กเกอร์ที่แสดงอยู่ในแผนที่
            initMap()
        });
    } else {
        console.error('Element with ID "clearSearchBtn" not found!');
    }
});







// ฟังก์ชันกรองเครื่องบินตามหมายเลขเครื่องหรือภารกิจ
function filterAircraftByMissionBase(searchTerm) {
    const listContainer = document.getElementById("aircraftList");

    // ถ้าไม่มีคำค้นหา ให้แสดงเครื่องบินทั้งหมด
    if (searchTerm === "") {
        markers.forEach(({ marker }) => {
            marker.addTo(map); // แสดงมาร์กเกอร์ทั้งหมด
        });
        listContainer.style.display = "block"; // แสดงรายการทั้งหมด
        return;
    }

    // กรองข้อมูลตามหมายเลขเครื่องบิน หรือ ภารกิจ/ฐานที่ตั้ง
    const filteredFlights = flightData.filter(flight =>
        flight.aircraftNumber.toLowerCase().includes(searchTerm.toLowerCase()) || // ค้นหาจากหมายเลขเครื่องบิน
        flight.missionBase.toLowerCase().includes(searchTerm.toLowerCase()) // ค้นหาจากภารกิจ/ฐานที่ตั้ง
    );

    // แสดง/ซ่อนมาร์กเกอร์ตามการค้นหา
    markers.forEach(({ flight, marker }) => {
        if (filteredFlights.some(f => f.aircraftNumber === flight.aircraftNumber)) {
            marker.addTo(map); // แสดงมาร์กเกอร์ที่ตรงกับคำค้นหา
        } else {
            map.removeLayer(marker); // ซ่อนมาร์กเกอร์ที่ไม่ตรงกับคำค้นหา
        }
    });

    // ถ้ามีผลลัพธ์ แสดงรายการใหม่ ถ้าไม่มี ให้ซ่อน
    if (filteredFlights.length > 0) {
        generateAircraftList(filteredFlights);
        listContainer.style.display = "block"; // แสดงรายการ
    } else {
        listContainer.style.display = "none"; // ซ่อนทั้งหมดถ้าไม่มีผลลัพธ์
    }
}









async function updateSidebar(flight) {
    const sidebar = document.getElementById('sidebar');
    const sidebarContent = document.getElementById('sidebar-content');

    const aircraftKey = flight.name.trim().toUpperCase();
    const aircraftImage = aircraftImages[aircraftKey] || "https://via.placeholder.com/320x180?text=No+Image";

    let maxHours = 150;  // ค่าพื้นฐานสำหรับเครื่องบินทั่วไป
    if (flight.name.toUpperCase() === "CARAVAN" ) {
        maxHours = 100;  // สำหรับ CARAVAN และ SKA350 ใช้ 100 ชั่วโมง
    }
    if (flight.name.toUpperCase() === "CN-235" || flight.name.toUpperCase() === "SKA350") {
        maxHours = 200;  // สำหรับ CN-235 ใช้ 200 ชั่วโมง
    }

    // เช็คหากเป็นเฮลิคอปเตอร์และปรับ maxHours
    let maintenanceHoursValue = null;
    if (flight.type === 'helicopter') {
        console.log("✅ ตรวจสอบข้อมูลเฮลิคอปเตอร์:", flight.aircraftNumber);

        // ตรวจสอบประเภทการซ่อมบำรุงจากข้อมูล JSON โดยตรง
        if (flight.maintenanceType) {
            console.log(`✅ พบประเภทการซ่อมบำรุง: ${flight.maintenanceType} ชั่วโมง`);

            // กำหนด maxHours ตามประเภทการซ่อมบำรุง
            if (flight.maintenanceType === "100") {
                maxHours = 100;
                console.log("✅ กำหนด maxHours = 100 จากประเภทการซ่อมบำรุง");
            } else if (flight.maintenanceType === "150") {
                maxHours = 150;
                console.log("✅ กำหนด maxHours = 150 จากประเภทการซ่อมบำรุง");
            } else if (flight.maintenanceType === "300") {
                maxHours = 300;
                console.log("✅ กำหนด maxHours = 300 จากประเภทการซ่อมบำรุง");
            }

            // เก็บค่า aCheck เพื่อใช้ในการคำนวณ
            maintenanceHoursValue = flight.aCheck;
            console.log(`✅ ใช้ค่า aCheck: ${maintenanceHoursValue} สำหรับการคำนวณ`);
        } else if (flight.aCheckDue) {
            // ถ้าไม่มี maintenanceType แต่มี aCheckDue (สำหรับความเข้ากันได้กับข้อมูลเก่า)
            console.log(`✅ พบค่า aCheckDue: ${flight.aCheckDue}`);

            // กำหนด maxHours ตามค่า aCheckDue
            if (flight.aCheckDue.includes("100")) {
                maxHours = 100;
                console.log("✅ กำหนด maxHours = 100 จากค่า aCheckDue");
            } else if (flight.aCheckDue.includes("150")) {
                maxHours = 150;
                console.log("✅ กำหนด maxHours = 150 จากค่า aCheckDue");
            } else if (flight.aCheckDue.includes("300")) {
                maxHours = 300;
                console.log("✅ กำหนด maxHours = 300 จากค่า aCheckDue");
            }

            // เก็บค่า aCheck เพื่อใช้ในการคำนวณ
            maintenanceHoursValue = flight.aCheck;
            console.log(`✅ ใช้ค่า aCheck: ${maintenanceHoursValue} สำหรับการคำนวณ`);
        } else {
            // ถ้าไม่มีทั้ง maintenanceType และ aCheckDue ให้ใช้ค่าเริ่มต้น
            maxHours = 300;  // ค่าเริ่มต้นสำหรับเฮลิคอปเตอร์
            console.log("⚠️ ไม่พบข้อมูลการซ่อมบำรุง ใช้ค่าเริ่มต้น maxHours = 300");
        }
    }

    console.log("✅ maxHours:", maxHours);

    // คำนวณชั่วโมงคงเหลือและเปอร์เซ็นต์
    let remainingHoursToMaintenance;
    let aCheckPercentage;

    if (flight.type === 'helicopter') {
        // สำหรับเฮลิคอปเตอร์
        // ใช้ค่า aCheck โดยตรงเป็นชั่วโมงคงเหลือ
        remainingHoursToMaintenance = convertTimeToDecimal(flight.aCheck) || 0;

        // คำนวณเปอร์เซ็นต์สำหรับเฮลิคอปเตอร์
        // เปอร์เซ็นต์ = (1 - ชั่วโมงคงเหลือ/maxHours) * 100
        aCheckPercentage = (1 - (remainingHoursToMaintenance / maxHours)) * 100;

        console.log(`✅ คำนวณเฮลิคอปเตอร์: ชั่วโมงคงเหลือ = ${remainingHoursToMaintenance.toFixed(2)} ชั่วโมง`);
        console.log(`✅ คำนวณเปอร์เซ็นต์เฮลิคอปเตอร์: (1 - ${remainingHoursToMaintenance.toFixed(2)}/${maxHours}) * 100 = ${aCheckPercentage.toFixed(2)}%`);
    } else {
        // สำหรับเครื่องบินทั่วไป
        const flightHoursValue = convertTimeToDecimal(flight.remainingHours) || 0;
        const aCheckValue = convertTimeToDecimal(flight.aCheck) || 0;

        // คำนวณผลต่าง (aCheck - remainingHours)
        remainingHoursToMaintenance = Math.max(0, aCheckValue - flightHoursValue);

        // คำนวณเปอร์เซ็นต์สำหรับเครื่องบินทั่วไป
        aCheckPercentage = 100 - (remainingHoursToMaintenance / maxHours) * 100;
        console.log(`✅ คำนวณเฮลิคอปเตอร์: ${flight.remainingHours}`);
        console.log(`✅ คำนวณเครื่องบิน: ${aCheckValue} - ${flightHoursValue} = ${remainingHoursToMaintenance.toFixed(2)} ชั่วโมง`);
        console.log(`✅ คำนวณเปอร์เซ็นต์เครื่องบิน: 100 - (${remainingHoursToMaintenance.toFixed(2)}/${maxHours}) * 100 = ${aCheckPercentage.toFixed(2)}%`);
    }

    // แปลงกลับเป็นรูปแบบ HH:MM สำหรับแสดงผล หรือใช้ค่าดิบสำหรับ SKA
    let formattedRemainingHours;
    
    // ตรวจสอบว่าเป็นเครื่องบิน SKA หรือไม่
    const isSKA = flight.name && (flight.name.toUpperCase().includes("SKA") || flight.name.toUpperCase().includes("SUPER KING AIR"));
    
    if (isSKA) {
        // สำหรับเครื่องบิน SKA ให้แสดงค่าทศนิยม 1 ตำแหน่ง
        formattedRemainingHours = remainingHoursToMaintenance.toFixed(1);
        console.log(`✅ SKA: แสดงค่าทศนิยม ${formattedRemainingHours}`);
    } else {
        // สำหรับเครื่องบินทั่วไป ให้แปลงเป็นรูปแบบ HH:MM
        formattedRemainingHours = formatDecimalToTime(remainingHoursToMaintenance);
        console.log(`✅ ทั่วไป: แปลงเป็นรูปแบบเวลา ${formattedRemainingHours}`);
    }

    // ถ้าเปอร์เซ็นต์ติดลบ ให้ตั้งเป็น 0%
    if (aCheckPercentage < 0) {
        aCheckPercentage = 0;
    }

    // ตรวจสอบไม่ให้เปอร์เซ็นต์เกิน 100
    if (aCheckPercentage > 100) {
        aCheckPercentage = 100;
    }

    // กำหนดสีของหลอดตามเปอร์เซ็นต์
    let barColor;

    if (flight.type === 'helicopter') {
        // สำหรับเฮลิคอปเตอร์ (เปอร์เซ็นต์ยิ่งสูงยิ่งใกล้ครบซ่อม)
        if (aCheckPercentage > 90) {
            barColor = 'var(--danger-color)';  // สีแดง (มากกว่า 90%)
        } else if (aCheckPercentage > 70) {
            barColor = 'var(--warning-color)';  // สีส้ม (70% ถึง 90%)
        } else {
            barColor = 'var(--success-color)';  // สีเขียว (น้อยกว่า 70%)
        }
    } else {
        // สำหรับเครื่องบินทั่วไป (เปอร์เซ็นต์ยิ่งสูงยิ่งใกล้ครบซ่อม)
        if (aCheckPercentage > 90) {
            barColor = 'var(--danger-color)';  // สีแดง (มากกว่า 90%)
        } else if (aCheckPercentage > 70) {
            barColor = 'var(--warning-color)';  // สีส้ม (70% ถึง 90%)
        } else {
            barColor = 'var(--success-color)';  // สีเขียว (น้อยกว่า 70%)
        }
    }

    // สถานะการใช้งาน
    const isAvailable = flight.status.toLowerCase() === "yes";
    const statusText = isAvailable ? "พร้อมใช้งาน" : "ไม่พร้อมใช้งาน";
    const statusClass = isAvailable ? "status-available" : "status-unavailable";
    const statusIcon = isAvailable ? "fa-check-circle" : "fa-times-circle";
    const statusColor = isAvailable ? "var(--success-color)" : "var(--danger-color)";

    sidebarContent.innerHTML = `
        <button class="close-btn" onclick="closeSidebar()">
            <i class="fas fa-times"></i>
        </button>

        <div class="sidebar-header">
            <h2 class="popup-title">${flight.name}</h2>
            <div class="aircraft-number">${flight.aircraftNumber}</div>
            <div class="status-badge" style="background-color: ${statusColor}">
                <i class="fas ${statusIcon}"></i>
                ${statusText}
            </div>
        </div>

        <div class="image-container">
            <img src="${aircraftImage}" alt="${flight.name}" class="airplane-image">
            <div class="image-overlay"></div>
        </div>

        <div class="info-card flight-hours">
            <div class="info-card-header">
                <i class="fas fa-clock"></i>
                <h3>ชั่วโมงบิน</h3>
            </div>
            <div class="info-card-content">
                <div class="info-item highlight">
                    <span class="info-value">${flight.remainingHours}</span>
                    <span class="info-label">ชั่วโมง</span>
                </div>
            </div>
        </div>

        <div class="info-card">
            <div class="info-card-header">
                <i class="fas fa-cogs"></i>
                <h3>เครื่องยนต์</h3>
            </div>
            <div class="info-card-content engine-grid">
                <div class="info-item">
                    <span class="info-label">No.1 / LH</span>
                    <span class="info-value">${flight.engineLH} ชม.</span>
                </div>
                <div class="info-item">
                    <span class="info-label">No.2 / RH</span>
                    <span class="info-value">${flight.engineRH} ชม.</span>
                </div>
            </div>
        </div>

        <div class="info-card">
            <div class="info-card-header">
                <i class="fas fa-tools"></i>
                <h3>ข้อมูลซ่อมบำรุง</h3>
            </div>
            <div class="info-card-content">
                <div class="info-item">
                    <span class="info-label">ครบซ่อม</span>
                    <span class="info-value">${formattedRemainingHours} / ${maxHours} ชม. (${aCheckPercentage.toFixed(1)}%)</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${aCheckPercentage}%; background-color: ${barColor};">
                        <span class="progress-text">${aCheckPercentage.toFixed(1)}%</span>
                    </div>
                </div>
                ${flight.type === 'helicopter' && flight.maintenanceHours ? `
                <div class="helicopter-maintenance">
                    <h4>ชั่วโมงบินคงเหลือครบซ่อม</h4>
                    <div class="maintenance-grid">
                        <div class="maintenance-item ${flight.maintenanceType === '100' ? 'active' : ''}">
                            <span class="maintenance-label">100 ชม.</span>
                            <span class="maintenance-value">${flight.maintenanceHours.hours100 || '-'}</span>
                        </div>
                        <div class="maintenance-item ${flight.maintenanceType === '150' ? 'active' : ''}">
                            <span class="maintenance-label">150 ชม.</span>
                            <span class="maintenance-value">${flight.maintenanceHours.hours150 || '-'}</span>
                        </div>
                        <div class="maintenance-item ${flight.maintenanceType === '300' ? 'active' : ''}">
                            <span class="maintenance-label">300 ชม.</span>
                            <span class="maintenance-value">${flight.maintenanceHours.hours300 || '-'}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="info-card">
            <div class="info-card-header">
                <i class="fas fa-map-marker-alt"></i>
                <h3>สถานที่</h3>
            </div>
            <div class="info-card-content">
                <div class="info-item">
                    <span class="info-label">ภารกิจ/ฐานที่ตั้ง</span>
                    <span class="info-value">${flight.missionBase}</span>
                </div>
            </div>
        </div>

        <div class="info-card">
            <div class="info-card-header">
                <i class="fas fa-user-cog"></i>
                <h3>ผู้ควบคุมงานช่าง</h3>
            </div>
            <div class="info-card-content">
                <div class="info-item">
                    <span class="info-value">${flight.maintenanceManager}</span>
                </div>
            </div>
        </div>

        ${flight.note ? `
        <div class="info-card">
            <div class="info-card-header">
                <i class="fas fa-sticky-note"></i>
                <h3>หมายเหตุ</h3>
            </div>
            <div class="info-card-content">
                <div class="note-box">
                    ${flight.note}
                </div>
            </div>
        </div>
        ` : ""}
    `;

    // แสดง sidebar ด้วย animation
    sidebar.style.display = 'block';
    setTimeout(() => {
        sidebar.classList.add('active');

        // ปรับขนาดแผนที่ในโหมดมือถือ
        if (checkIsMobile()) {
            const mapElement = document.getElementById('map');
            if (mapElement) {
                mapElement.style.height = '40%';
                mapElement.style.position = 'absolute';
                mapElement.style.top = '0';

                // บังคับให้แผนที่คำนวณขนาดใหม่
                if (typeof map !== 'undefined' && map) {
                    setTimeout(() => {
                        map.invalidateSize();
                    }, 300);
                }
            }
        }

        // เพิ่ม CSS สำหรับส่วนแสดงข้อมูลการซ่อมบำรุงของเฮลิคอปเตอร์
        const style = document.createElement('style');
        style.textContent = `
            .helicopter-maintenance {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--surface-2dp);
            }
            .helicopter-maintenance h4 {
                font-size: 14px;
                margin-bottom: 10px;
                color: var(--on-surface-medium);
            }
            .maintenance-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            .maintenance-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px;
                border-radius: 8px;
                background-color: var(--surface-1dp);
                transition: all 0.3s ease;
            }
            .maintenance-item.active {
                background-color: var(--primary-color);
                color: white;
            }
            .maintenance-label {
                font-size: 12px;
                margin-bottom: 5px;
            }
            .maintenance-value {
                font-size: 14px;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);

        // เพิ่ม animation ให้กับองค์ประกอบภายใน sidebar
        const elements = sidebarContent.querySelectorAll('.info-card, .sidebar-header, .image-container');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';

            setTimeout(() => {
                el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 100 + (index * 100));
        });
    }, 10);
}

// ฟังก์ชันรีเซ็ตขนาดของแผนที่ให้เป็นเต็มจอ
function resetMapSize() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // ตรวจสอบว่า sidebar กำลังแสดงอยู่หรือไม่
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        console.log("ไม่รีเซ็ตขนาดแผนที่เนื่องจาก sidebar กำลังแสดงอยู่");
        return;
    }

    // ตั้งค่าสไตล์ของแผนที่กลับเป็นค่าเริ่มต้น
    mapElement.style.cssText = `
        height: 100vh !important;
        position: absolute !important;
        top: 0 !important;
        bottom: auto !important;
        left: 0 !important;
        z-index: 1 !important;
        width: 100% !important;
    `;

    // บังคับให้แผนที่คำนวณขนาดใหม่
    if (typeof map !== 'undefined' && map) {
        map.invalidateSize();
    }

    console.log("รีเซ็ตขนาดแผนที่เป็นเต็มจอแล้ว");
}

// เพิ่ม event listener สำหรับการเปลี่ยนแปลงขนาดหน้าจอ
window.addEventListener('resize', function() {
    if (checkIsMobile()) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar || !sidebar.classList.contains('active')) {
            // ถ้า sidebar ไม่แสดง ให้รีเซ็ตขนาดแผนที่
            resetMapSize();
        }
    }
});

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');

    // ซ่อน sidebar ด้วย animation
    sidebar.classList.remove('active');

    // คืนค่าความสูงของแผนที่กลับเป็น 100% เมื่อปิด sidebar
    if (checkIsMobile()) {
        // ใช้ setTimeout เพื่อให้แน่ใจว่าการเปลี่ยนแปลงจะเกิดขึ้นหลังจาก CSS transition
        setTimeout(resetMapSize, 50);
    }

    // รอให้ animation เสร็จสิ้นก่อนซ่อน element
    setTimeout(() => {
        sidebar.style.display = 'none';

        // ตรวจสอบอีกครั้งว่าแผนที่เต็มจอหรือไม่
        if (checkIsMobile()) {
            resetMapSize();

            // เพิ่มการตรวจสอบอีกครั้งหลังจากผ่านไป 500ms
            setTimeout(resetMapSize, 500);
        }
    }, 400);
}

// ฟังก์ชันนี้ถูกยกเลิกการใช้งานแล้ว เนื่องจากเราใช้ข้อมูลจาก JSON โดยตรง
// คงไว้เพื่อความเข้ากันได้กับโค้ดเก่า แต่จะไม่มีการเรียกใช้งานอีกต่อไป
async function HgetValidACheck(aircraftNumber) {
    console.log("ฟังก์ชัน HgetValidACheck ถูกยกเลิกการใช้งานแล้ว");
    return {
        column: null,
        value: null
    };
}













function getStatusGradient(status) {
    if (status === "yes") {
        return 'linear-gradient(135deg, #28a745, #218838)';
    } else if (status === "no") {
        return 'linear-gradient(135deg, #dc3545, #c82333)';
    }
    return 'linear-gradient(135deg, #dc3545, #c82333)';
}

// This duplicate event listener has been removed to fix potential issues







function setupAircraftListToggle() {
    const toggleListBtn = document.getElementById("toggleListBtn");
    const aircraftList = document.getElementById("aircraftList");
    const aircraftListContainer = document.getElementById("aircraftListContainer");

    if (toggleListBtn && aircraftList) {
        toggleListBtn.addEventListener("click", function () {
            if (aircraftList.style.display === "none" || aircraftList.style.display === "") {
                // ก่อนแสดงรายการ ตรวจสอบว่ามีข้อมูลหรือไม่
                if (flightData.length === 0) {
                    // ถ้าไม่มีข้อมูล ให้แสดงข้อความแจ้งเตือน
                    aircraftList.innerHTML = "<li class='no-results'>ไม่มีข้อมูลเครื่องบิน</li>";
                } else {
                    // ถ้ามีข้อมูล ให้สร้างรายการใหม่
                    generateAircraftList();
                }

                // แสดงรายการ
                aircraftList.style.display = "block";
                toggleListBtn.textContent = "▲ ปิดรายการเครื่องบิน";

                // ปรับขนาดคอนเทนเนอร์ให้เหมาะสม
                aircraftListContainer.style.maxHeight = "80vh";
                aircraftListContainer.style.overflowY = "auto";
            } else {
                // ซ่อนรายการ
                aircraftList.style.display = "none";
                toggleListBtn.textContent = "▼ เปิดรายการเครื่องบิน";

                // ปรับขนาดคอนเทนเนอร์กลับเป็นค่าเดิม
                aircraftListContainer.style.maxHeight = "";
                aircraftListContainer.style.overflowY = "hidden";
            }
        });
    }
}

// ฟังก์ชันตั้งค่าปุ่มรีเฟรชข้อมูล
function setupRefreshButton() {
    const refreshBtn = document.getElementById("refreshDataBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", async function() {
            // เพิ่มคลาส refreshing เพื่อให้ไอคอนหมุน
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('refreshing');
            }

            // ปิดปุ่มชั่วคราวเพื่อป้องกันการกดซ้ำ
            refreshBtn.disabled = true;

            try {
                // บังคับโหลดข้อมูลใหม่
                const success = await forceRefreshData();

                if (success) {
                    // แสดงข้อความแจ้งเตือนว่าอัปเดตสำเร็จ
                    const timestamp = new Date().toLocaleTimeString();
                    alert(`อัปเดตข้อมูลสำเร็จ (${timestamp})`);
                } else {
                    // แสดงข้อความแจ้งเตือนว่าอัปเดตไม่สำเร็จ
                    alert("ไม่สามารถอัปเดตข้อมูลได้ โปรดลองอีกครั้งในภายหลัง");
                }
            } catch (error) {
                console.error("❌ รีเฟรชข้อมูลไม่สำเร็จ:", error);
                alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล โปรดลองอีกครั้งในภายหลัง");
            } finally {
                // นำคลาส refreshing ออกเพื่อหยุดการหมุน
                if (icon) {
                    icon.classList.remove('refreshing');
                }

                // เปิดใช้งานปุ่มอีกครั้ง
                refreshBtn.disabled = false;
            }
        });
    }
}

// ฟังก์ชันอัปเดตมาร์กเกอร์บนแผนที่
function updateMapMarkers() {
    // ตรวจสอบว่ามีข้อมูลหรือไม่
    if (!flightData || flightData.length === 0) {
        console.log("ไม่มีข้อมูลเครื่องบิน ไม่สามารถสร้างมาร์กเกอร์ได้");
        return;
    }

    // ตรวจสอบว่า Leaflet ถูกโหลดหรือไม่
    if (typeof L === 'undefined') {
        console.error("ไม่พบ Leaflet library ในฟังก์ชัน updateMapMarkers");
        return;
    }

    // ตรวจสอบว่ามีแผนที่หรือไม่
    if (typeof map === 'undefined' || !map) {
        console.error("ไม่พบแผนที่ในฟังก์ชัน updateMapMarkers");
        return;
    }

    // ลบมาร์กเกอร์เดิมทั้งหมด
    if (markers && markers.length > 0) {
        markers.forEach(({ marker }) => {
            if (marker && map.hasLayer(marker)) {
                try {
                    map.removeLayer(marker);
                } catch (error) {
                    console.warn("ไม่สามารถลบมาร์กเกอร์ได้:", error);
                }
            }
        });
    }

    // เคลียร์อาร์เรย์มาร์กเกอร์
    markers = [];

    // รีเซ็ตตัวนับตำแหน่งเพื่อจัดเรียงมาร์กเกอร์ใหม่
    // ล้างข้อมูลเก่าทั้งหมด
    for (let key in positionCounts) {
        delete positionCounts[key];
    }

    // สร้างมาร์กเกอร์ใหม่จากข้อมูลปัจจุบัน
    flightData.forEach(flight => {
        try {
            // ตรวจสอบว่าข้อมูลถูกต้องหรือไม่
            if (!flight || typeof flight !== 'object') {
                console.warn("พบข้อมูลเครื่องบินที่ไม่ถูกต้อง:", flight);
                return;
            }

            // ตรวจสอบว่าเป็นเฮลิคอปเตอร์หรือไม่
            const isHelicopter = flight.type === "helicopter";
            const iconUrl = isHelicopter ? "helicopter.svg" : "airplane.svg"; // เลือกไอคอนตามประเภทยาน

            // ตรวจสอบว่ามีพิกัดหรือไม่
            if (!flight.latitude || !flight.longitude) {
                console.warn("ไม่พบพิกัดของเครื่องบิน:", flight.aircraftNumber);
                return;
            }

            // ตั้งค่าสีของเงาตามสถานะ (ตรวจสอบว่า status มีค่าหรือไม่)
            const status = flight.status || "no";
            const shadowColor = (status.toString().toUpperCase() === "YES")
                ? "#34c759"  // สีเขียวสำหรับใช้งานได้ (ใช้ iOS green color)
                : "#ff3b30";  // สีแดงสำหรับใช้งานไม่ได้ (ใช้ iOS red color)

            // สร้างไอคอนแบบ divIcon
            // สร้างชื่อย่อของเครื่องบิน
            const shortName = flight.name ? (flight.name.split('-')[0] || flight.name) : "";

            // กำหนดสถานะสำหรับแสดงในไอคอน
            const statusText = (status.toString().toUpperCase() === "YES") ? "พร้อมใช้งาน" : "ไม่พร้อมใช้งาน";
            const statusIcon = (status.toString().toUpperCase() === "YES") ? "✓" : "✗";

            // คำนวณเปอร์เซ็นต์ครบซ่อม (ถ้ามีข้อมูล)
            let maintenanceInfo = "";
            if (flight.aCheck && flight.aCheckLimit) {
                const maintenancePercentage = Math.round((flight.aCheck / flight.aCheckLimit) * 100);
                maintenanceInfo = ` - ครบซ่อม ${maintenancePercentage}%`;
            }

            // แสดงลขเครื่องสำหรับทั้งเครื่องบินและเฮลิคอปเตอร์
            let markerLabel = `${typeof flight.aircraftNumber === 'string' ? flight.aircraftNumber.split(' ').pop() : (flight.aircraftNumber || '')}`;

            // ตรวจสอบชั่วโมงครบซ่อมสำหรับเฮลิคอปเตอร์ (เฉพาะสำหรับ tooltip)
            if (isHelicopter) {
                // เพิ่มข้อมูลเฮลิคอปเตอร์ในส่วน maintenanceInfo สำหรับแสดงใน tooltip
                if (flight.aCheckPercentage !== undefined) {
                    maintenanceInfo += ` - ครบซ่อม: ${Math.round(flight.aCheckPercentage)}%`;

                    // เพิ่มข้อมูลเพิ่มเติม
                    if (flight.aCheck) {
                        maintenanceInfo += ` (${flight.aCheck})`;
                    }

                    // เพิ่มข้อมูลประเภทการซ่อมบำรุง
                    if (flight.maintenanceType) {
                        maintenanceInfo += ` - ประเภท: ${flight.maintenanceType} ชม.`;
                    }
                }
            }

            // สำหรับเฮลิคอปเตอร์ ให้แสดงเฉพาะหมายเลขเครื่อง ไม่ต้องแสดงชั่วโมง
            if (isHelicopter) {
                // ใช้เฉพาะหมายเลขเครื่องสำหรับเฮลิคอปเตอร์
                markerLabel = `${markerLabel}`;

                // ตรวจสอบตัวแปรทั้ง 3 ตัวสำหรับแสดงใน tooltip เท่านั้น
                const maintenanceHours = [
                    { label: "100", value: flight["ชั่วโมงบินคงเหลือครบซ่อม 100"] },
                    { label: "150", value: flight["ชั่วโมงบินคงเหลือครบซ่อม 150"] },
                    { label: "300", value: flight["ชั่วโมงบินคงเหลือครบซ่อม 300"] }
                ];

                // กรองเฉพาะตัวแปรที่มีค่าในรูปแบบ XX:XX หรือ X:XX
                const validHours = maintenanceHours.filter(item => {
                    return item.value &&
                           item.value !== "" &&
                           item.value !== "-" &&
                           item.value !== "_" &&
                           /^\d+:\d+$/.test(item.value);
                });

                // เพิ่มข้อมูลทั้งหมดที่มีในส่วน maintenanceInfo สำหรับแสดงใน tooltip
                if (validHours.length > 0) {
                    maintenanceInfo += validHours.map(hour =>
                        ` - ชั่วโมงครบซ่อม ${hour.label}: ${hour.value}`
                    ).join('');
                }
            }

            const vehicleIcon = L.divIcon({
                className: 'custom-icon',  // ตั้งคลาส CSS เพื่อจัดการสไตล์
                html: `<div class="marker-container">
                        <div class="marker-status" style="background-color: ${shadowColor}; opacity: 0.9;">
                          <span class="marker-status-icon">${statusIcon}</span>
                        </div>
                        <img src="${iconUrl}" class="marker-image">
                        <div class="marker-label" title="${flight.name} - ${statusText}${maintenanceInfo}">
                          ${markerLabel}
                        </div>
                      </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 30],
                popupAnchor: [0, -30]
            });

            // คำนวณตำแหน่งที่ไม่ทับซ้อนกันโดยใช้ฟังก์ชัน addJitter
            let adjustedLat = parseFloat(flight.latitude);
            let adjustedLng = parseFloat(flight.longitude);

            // เพิ่ม jitter ให้กับพิกัดเพื่อไม่ให้มาร์กเกอร์ทับกัน
            try {
                const [jitteredLat, jitteredLng] = addJitter([adjustedLat, adjustedLng]);
                adjustedLat = jitteredLat;
                adjustedLng = jitteredLng;
            } catch (error) {
                console.warn("ไม่สามารถใช้ฟังก์ชัน addJitter ได้:", error);
            }

            // สร้างมาร์กเกอร์ด้วยตำแหน่งที่ปรับแล้ว
            try {
                const marker = L.marker([adjustedLat, adjustedLng], { icon: vehicleIcon })
                    .addTo(map)
                    .on('click', function () {
                        try {
                            // ตรวจสอบว่ามีข้อมูลเครื่องบินหรือไม่
                            if (!flight) {
                                console.error("ไม่พบข้อมูลเครื่องบิน");
                                return;
                            }

                            console.log("กำลังอัปเดต sidebar จากมาร์กเกอร์สำหรับเครื่องบิน:", flight.name, flight.aircraftNumber);
                            if (typeof window.updateSidebar === 'function') {
                                window.updateSidebar(flight);
                            } else {
                                console.error("ไม่พบฟังก์ชัน updateSidebar");
                            }
                        } catch (error) {
                            console.error("เกิดข้อผิดพลาดในการอัปเดต sidebar จากมาร์กเกอร์:", error);
                            console.error("รายละเอียดข้อผิดพลาด:", error.message);
                            console.error("Stack trace:", error.stack);
                        }
                    });

                // เก็บข้อมูลมาร์กเกอร์
                markers.push({ flight, marker });
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการสร้างมาร์กเกอร์:", error);
            }
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการประมวลผลข้อมูลเครื่องบิน:", error);
        }
    });
}

// ฟังก์ชันสกัดชื่อจังหวัดจากข้อความ
function extractProvince(text) {
    if (!text) return "กรุงเทพฯ";
    
    // แปลงเป็นตัวพิมพ์เล็กและตัดช่องว่างที่ไม่จำเป็น
    const normalizedText = text.toLowerCase().trim();
    
    // ตรวจสอบว่ามีชื่อจังหวัดอยู่ในข้อความหรือไม่
    for (const province in provinceCoordinates) {
        if (normalizedText.includes(province.toLowerCase())) {
            return province;
        }
    }
    
    // ถ้าไม่พบชื่อจังหวัด ให้ใช้ค่าเริ่มต้น
    return "กรุงเทพฯ";
}

// ฟังก์ชันแปลงเวลาในรูปแบบ HH:MM เป็นชั่วโมงทศนิยม
function convertTimeToDecimal(timeStr) {
    console.log(`กำลังแปลงเวลา: ${timeStr} (ประเภท: ${typeof timeStr})`);

    // ตรวจสอบว่าเป็นสตริงหรือไม่
    if (typeof timeStr !== 'string' && typeof timeStr !== 'number') {
        console.log(`  - ไม่ใช่สตริงหรือตัวเลข คืนค่า 0`);
        return 0;
    }

    // แปลงเป็นสตริง
    timeStr = timeStr.toString().trim();
    console.log(`  - หลังแปลงเป็นสตริงและตัดช่องว่าง: "${timeStr}"`);

    // ถ้าเป็นตัวเลขล้วน ให้แปลงเป็นทศนิยมและคืนค่า
    if (!isNaN(parseFloat(timeStr)) && !timeStr.includes(':')) {
        const result = parseFloat(timeStr);
        console.log(`  - เป็นตัวเลขล้วน แปลงเป็น: ${result}`);
        return result;
    }

    // ถ้ามีรูปแบบ HH:MM
    if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        console.log(`  - พบรูปแบบ HH:MM: ${parts.join(', ')}`);

        if (parts.length >= 2) {
            const hours = parseFloat(parts[0]) || 0;
            const minutes = parseFloat(parts[1]) || 0;
            const result = hours + (minutes / 60);
            console.log(`  - แปลงเป็นทศนิยม: ${hours} + (${minutes}/60) = ${result}`);
            return result;
        }
    }

    // ถ้าไม่สามารถแปลงได้ ให้คืนค่า 0
    console.log(`  - ไม่สามารถแปลงได้ คืนค่า 0`);
    return 0;
}

// ฟังก์ชันแปลงชั่วโมงทศนิยมเป็นรูปแบบ HH:MM
function formatDecimalToTime(decimalHours) {
    if (isNaN(decimalHours) || decimalHours < 0) {
        return "0:00";
    }

    // แยกส่วนชั่วโมงและนาที
    const hours = Math.floor(decimalHours);
    // ใช้ Math.floor แทน Math.round เพื่อให้ได้ค่านาทีที่ถูกต้อง
    const minutes = Math.floor((decimalHours - hours) * 60);

    console.log(`แปลงเวลา: ${decimalHours} -> ${hours}:${minutes}`);

    // จัดรูปแบบให้เป็น HH:MM
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

// ฟังก์ชันสำหรับเครื่องบิน SKA (ไม่ได้ใช้แล้ว เก็บไว้เผื่อต้องการใช้ในอนาคต)
function convertSKATimeFormat(timeStr) {
    return timeStr;
}

// ฟังก์ชันบังคับโหลดข้อมูลใหม่
async function forceRefreshData() {
    try {
        // ดึงวันที่ที่เลือกจากตัวเลือกวันที่
        const dateSelector = document.getElementById('dateSelector');
        const selectedDate = dateSelector ? dateSelector.value : null;

        // สร้างคีย์ cache ที่รวมวันที่ที่เลือก
        const cacheKey = selectedDate ? `flightDataCache_${selectedDate}` : 'flightDataCache';
        const timestampKey = selectedDate ? `flightDataTimestamp_${selectedDate}` : 'flightDataTimestamp';

        // ลบข้อมูล cache เดิม
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);

        // แสดงข้อความกำลังโหลด
        const listContainer = document.getElementById("aircraftList");
        if (listContainer) {
            listContainer.innerHTML = "<p class='loading'>กำลังรีเฟรชข้อมูล...</p>";
        }

        // โหลดข้อมูลใหม่
        await fetchFlightData(selectedDate);

        // อัปเดตมาร์กเกอร์บนแผนที่
        updateMapMarkers();

        return true; // คืนค่า true เมื่อสำเร็จ
    } catch (error) {
        console.error("❌ ไม่สามารถรีเฟรชข้อมูลได้:", error);
        return false; // คืนค่า false เมื่อเกิดข้อผิดพลาด
    }
}

// ไม่จำเป็นต้องมี event listener ซ้ำซ้อน เนื่องจากมีการตั้งค่าไว้แล้วในฟังก์ชัน setupAircraftListToggle

// ฟังก์ชันสลับการแสดงรายการเครื่องบินบนมือถือ
function toggleMobileList() {
    console.log("เรียกใช้ฟังก์ชัน toggleMobileList");

    const mobileListToggle = document.getElementById('mobileListToggle');
    const aircraftListWrapper = document.getElementById('aircraftListWrapper');

    if (!mobileListToggle || !aircraftListWrapper) {
        console.error("ไม่พบ mobileListToggle หรือ aircraftListWrapper");
        return;
    }

    // ตรวจสอบว่าปุ่มมีข้อความว่าอะไร
    const buttonText = mobileListToggle.innerText.trim();
    console.log("ข้อความบนปุ่ม:", buttonText);

    // ตรวจสอบสถานะปัจจุบันจากข้อความบนปุ่ม
    const isShowingList = buttonText.includes("ซ่อนรายการ");
    console.log("กำลังแสดงรายการ (จากข้อความปุ่ม):", isShowingList);

    // ตัดสินใจจากข้อความบนปุ่มเป็นหลัก
    if (isShowingList) {
        // ถ้ากำลังแสดงรายการอยู่ ให้ซ่อนรายการ
        console.log("กำลังแสดงรายการอยู่ -> จะซ่อนรายการ");

        // ใช้โค้ดเดียวกับที่ทำงานได้จริงเมื่อกดเลือกรายชื่อเครื่องบิน
        const mobileOverlay = document.getElementById('mobileOverlay');

        // ซ่อนรายการ
        aircraftListWrapper.classList.remove('expanded');
        aircraftListWrapper.classList.add('collapsed');

        // ตั้งค่าสไตล์โดยตรงเพื่อให้แน่ใจว่าจะซ่อน
        aircraftListWrapper.style.transform = 'translateY(-100%)';
        aircraftListWrapper.style.visibility = 'hidden';
        aircraftListWrapper.style.opacity = '0';

        // ซ่อน overlay
        if (mobileOverlay) {
            mobileOverlay.classList.remove('active');
        }

        // เปลี่ยนข้อความปุ่ม
        mobileListToggle.innerHTML = '<i class="fas fa-list"></i> แสดงรายการ';

        // ลบ event listener เดิมก่อน
        mobileListToggle.removeEventListener('click', toggleMobileList);
        mobileListToggle.removeEventListener('click', showAircraftList);
        mobileListToggle.removeEventListener('click', hideAircraftList);
        mobileListToggle.onclick = null;

        // เพิ่ม event listener ใหม่
        mobileListToggle.onclick = function(event) {
            if (event) event.preventDefault();
            console.log("คลิกที่ปุ่มแสดงรายการ (หลังซ่อน)");
            showAircraftList();
            return false;
        };

        // อนุญาตให้เลื่อนหน้าจอได้อีกครั้ง
        document.body.style.overflow = '';
    } else {
        // ถ้ากำลังซ่อนรายการอยู่ ให้แสดงรายการ
        console.log("กำลังซ่อนรายการอยู่ -> จะแสดงรายการ");
        showAircraftList();
    }
}

// ฟังก์ชันแสดงรายการเครื่องบิน
function showAircraftList() {
    console.log("เรียกใช้ฟังก์ชัน showAircraftList");

    const aircraftListWrapper = document.getElementById('aircraftListWrapper');
    const mobileListToggle = document.getElementById('mobileListToggle');
    const aircraftList = document.getElementById('aircraftList');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (!aircraftListWrapper) {
        console.error("ไม่พบ aircraftListWrapper");
        return;
    }

    // ตรวจสอบว่ามีรายการเครื่องบินหรือไม่
    if (aircraftList && aircraftList.children.length === 0) {
        console.log("ไม่พบรายการเครื่องบิน กำลังสร้างรายการใหม่...");
        generateAircraftList(flightData);
    }

    // แสดงรายการเครื่องบิน
    if (aircraftList) {
        aircraftList.style.display = 'block';
    }

    // ตั้งค่าสไตล์โดยตรงเพื่อให้แน่ใจว่าจะแสดง
    aircraftListWrapper.style.display = 'block';

    // ใช้ setTimeout เพื่อให้ browser มีเวลาอัปเดต DOM ก่อนที่จะเปลี่ยนคลาส
    setTimeout(() => {
        // เปลี่ยนคลาสและข้อความปุ่ม
        aircraftListWrapper.classList.remove('collapsed');
        aircraftListWrapper.classList.add('expanded');

        aircraftListWrapper.style.transform = 'translateY(0)';
        aircraftListWrapper.style.visibility = 'visible';
        aircraftListWrapper.style.opacity = '1';

        console.log("แสดงรายการแล้ว:", aircraftListWrapper.style.cssText);
    }, 10);

    // แสดง overlay
    if (mobileOverlay) {
        mobileOverlay.classList.add('active');
    }

    if (mobileListToggle) {
        mobileListToggle.innerHTML = '<i class="fas fa-times"></i> ซ่อนรายการ';

        // ลบ event listener เดิมก่อน
        mobileListToggle.removeEventListener('click', toggleMobileList);
        mobileListToggle.removeEventListener('click', showAircraftList);
        mobileListToggle.removeEventListener('click', hideAircraftList);
        mobileListToggle.onclick = null;

        // เพิ่ม event listener ใหม่
        mobileListToggle.onclick = function(event) {
            if (event) event.preventDefault();
            console.log("คลิกที่ปุ่มซ่อนรายการ (หลังแสดง)");
            hideAircraftList();
            return false;
        };
    }

    // บังคับให้แผนที่คำนวณขนาดใหม่
    if (typeof map !== 'undefined' && map) {
        setTimeout(function() {
            map.invalidateSize();
        }, 300);
    }

    // ป้องกันการเลื่อนหน้าจอเมื่อเปิดรายการ
    document.body.style.overflow = 'hidden';
}

// ฟังก์ชันซ่อนรายการเครื่องบิน
function hideAircraftList() {
    console.log("เรียกใช้ฟังก์ชัน hideAircraftList");

    const aircraftListWrapper = document.getElementById('aircraftListWrapper');
    const mobileListToggle = document.getElementById('mobileListToggle');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const aircraftList = document.getElementById('aircraftList');

    if (!aircraftListWrapper) {
        console.error("ไม่พบ aircraftListWrapper");
        return;
    }

    // ใช้โค้ดเดียวกับที่ทำงานได้จริงเมื่อกดเลือกรายชื่อเครื่องบิน
    aircraftListWrapper.classList.remove('expanded');
    aircraftListWrapper.classList.add('collapsed');

    // ตั้งค่าสไตล์โดยตรงเพื่อให้แน่ใจว่าจะซ่อน
    aircraftListWrapper.style.transform = 'translateY(-100%)';
    aircraftListWrapper.style.visibility = 'hidden';
    aircraftListWrapper.style.opacity = '0';

    console.log("ซ่อนรายการแล้ว:", aircraftListWrapper.style.cssText);

    // ซ่อน overlay
    if (mobileOverlay) {
        mobileOverlay.classList.remove('active');
        console.log("ซ่อน overlay แล้ว");
    }

    if (mobileListToggle) {
        mobileListToggle.innerHTML = '<i class="fas fa-list"></i> แสดงรายการ';
        console.log("เปลี่ยนข้อความปุ่มแล้ว");

        // ลบ event listener เดิมก่อน
        mobileListToggle.removeEventListener('click', toggleMobileList);
        mobileListToggle.removeEventListener('click', showAircraftList);
        mobileListToggle.removeEventListener('click', hideAircraftList);
        mobileListToggle.onclick = null;

        // เพิ่ม event listener ใหม่
        mobileListToggle.onclick = function(event) {
            if (event) event.preventDefault();
            console.log("คลิกที่ปุ่มแสดงรายการ (หลังซ่อน)");
            showAircraftList();
            return false;
        };
    }

    // บังคับให้แผนที่คำนวณขนาดใหม่
    if (typeof map !== 'undefined' && map) {
        setTimeout(function() {
            map.invalidateSize();
        }, 300);
    }

    // อนุญาตให้เลื่อนหน้าจอได้อีกครั้ง
    document.body.style.overflow = '';
}

// ฟังก์ชันตั้งค่าปุ่มควบคุมสำหรับมือถือ
function setupMobileControls() {
    console.log("กำลังตั้งค่าปุ่มควบคุมสำหรับมือถือ...");

    // ตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
    const isMobile = checkIsMobile();

    // ตั้งค่าเริ่มต้นสำหรับรายการเครื่องบินบนมือถือ
    const aircraftListWrapper = document.getElementById('aircraftListWrapper');
    const aircraftList = document.getElementById('aircraftList');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (aircraftListWrapper && isMobile) {
        console.log("กำลังตั้งค่าเริ่มต้นสำหรับรายการเครื่องบิน");

        // ตั้งค่าเริ่มต้น - ซ่อนรายการเครื่องบิน
        aircraftListWrapper.classList.remove('expanded');
        aircraftListWrapper.classList.add('collapsed');

        // ตั้งค่าสไตล์โดยตรงเพื่อให้แน่ใจว่าจะซ่อน
        aircraftListWrapper.style.transform = 'translateY(-100%)';
        aircraftListWrapper.style.visibility = 'hidden';
        aircraftListWrapper.style.opacity = '0';

        // แสดงรายการเครื่องบิน (แต่ wrapper จะถูกซ่อน)
        if (aircraftList) {
            aircraftList.style.display = 'block';
        }

        const mobileListToggle = document.getElementById('mobileListToggle');
        if (mobileListToggle) {
            mobileListToggle.innerHTML = '<i class="fas fa-list"></i> แสดงรายการ';

            // ลบ event listener ทั้งหมด
            mobileListToggle.removeEventListener('click', toggleMobileList);
            mobileListToggle.onclick = null;

            // เพิ่ม event listener ใหม่แบบ inline เท่านั้น
            mobileListToggle.onclick = function(event) {
                if (event) event.preventDefault(); // ป้องกันการส่งฟอร์ม
                console.log("คลิกที่ปุ่มแสดง/ซ่อนรายการ (setupMobileControls)");

                // ตรวจสอบข้อความบนปุ่ม
                const buttonText = mobileListToggle.innerText.trim();
                if (buttonText.includes("ซ่อนรายการ")) {
                    hideAircraftList();
                } else {
                    showAircraftList();
                }

                return false; // ป้องกันการส่งฟอร์ม
            };
        }

        // เพิ่ม event listener สำหรับ overlay เพื่อปิดรายการเมื่อคลิกที่พื้นหลัง
        if (mobileOverlay) {
            // ลบ event listener เดิมก่อน
            mobileOverlay.removeEventListener('click', toggleMobileList);
            mobileOverlay.removeEventListener('click', hideAircraftList);

            // เพิ่ม event listener ใหม่
            mobileOverlay.addEventListener('click', function(event) {
                if (event) event.preventDefault();
                console.log("คลิกที่ overlay");
                hideAircraftList();
            });
        }

        // ปรับปรุงสไตล์ของรายการเครื่องบิน
        const aircraftItems = document.querySelectorAll('.aircraft-item');
        aircraftItems.forEach(item => {
            item.style.padding = '8px 10px';
            item.style.marginBottom = '5px';
        });
    }

    // เพิ่ม event listener สำหรับการเปลี่ยนขนาดหน้าจอ
    window.addEventListener('resize', function() {
        const currentIsMobile = checkIsMobile();
        if (currentIsMobile !== isMobile && aircraftListWrapper) {
            if (currentIsMobile) {
                // เปลี่ยนเป็นมือถือ
                aircraftListWrapper.classList.remove('expanded');
                aircraftListWrapper.classList.add('collapsed');

                // ซ่อน overlay
                if (mobileOverlay) {
                    mobileOverlay.classList.remove('active');
                }

                // อนุญาตให้เลื่อนหน้าจอได้
                document.body.style.overflow = '';
            } else {
                // เปลี่ยนเป็นเดสก์ท็อป
                aircraftListWrapper.classList.remove('collapsed');
                aircraftListWrapper.classList.add('expanded');

                // ซ่อน overlay
                if (mobileOverlay) {
                    mobileOverlay.classList.remove('active');
                }

                // อนุญาตให้เลื่อนหน้าจอได้
                document.body.style.overflow = '';
            }
        }
    });

    // ปรับแต่งการแสดงผลตามอุปกรณ์
    if (isMobile) {
        // ปรับปุ่มและการแสดงผลสำหรับมือถือ
        const toggleListBtn = document.getElementById('toggleListBtn');
        if (toggleListBtn) {
            toggleListBtn.style.fontSize = '14px';
            toggleListBtn.style.padding = '8px 12px';
        }
    }
}


// ฟังก์ชันแปลงเวลาจากรูปแบบ "HH:MM" เป็นทศนิยม
function convertTimeToDecimal(timeString) {
    if (!timeString) return 0;

    // ถ้าเป็นตัวเลขอยู่แล้ว ให้คืนค่านั้นเลย
    if (typeof timeString === 'number') return timeString;

    // ถ้าเป็นสตริงที่มีรูปแบบ "HH:MM"
    if (typeof timeString === 'string' && timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours + (minutes / 60);
    }

    // ถ้าเป็นสตริงที่เป็นตัวเลข ให้แปลงเป็นตัวเลข
    if (typeof timeString === 'string' && !isNaN(timeString)) {
        return parseFloat(timeString);
    }

    // กรณีอื่นๆ ให้คืนค่า 0
    return 0;
}

// ฟังก์ชันแปลงทศนิยมกลับเป็นรูปแบบ "HH:MM"
function formatDecimalToTime(decimalHours) {
    if (isNaN(decimalHours)) return "0:00";

    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);

    // ถ้านาทีเป็น 60 ให้ปรับเป็นชั่วโมงถัดไป
    if (minutes === 60) {
        return `${hours + 1}:00`;
    }

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

// ฟังก์ชันเพิ่ม jitter ให้กับพิกัด เพื่อไม่ให้มาร์กเกอร์ทับซ้อนกัน
// ตัวแปรเก็บจำนวนมาร์กเกอร์ในแต่ละตำแหน่งถูกประกาศไว้แล้วที่ด้านบน

// ตัวแปรเก็บรูปภาพของเครื่องบินแต่ละประเภท
window.aircraftImages = {
    "KING AIR 350": "https://www.royalrain.go.th/royalrain/IMG/content/archive/1_SuperKingAir350(SKA350).jpg",
    "SKA350": "https://www.royalrain.go.th/royalrain/IMG/content/archive/1_SuperKingAir350(SKA350).jpg",
    "CARAVAN": "https://www.royalrain.go.th/royalrain/IMG/content/archive/2_Caravan.jpg",
    "CN-235": "https://www.royalrain.go.th/royalrain/IMG/content/archive/3_CN-235.jpg",
    "CASA": "https://www.royalrain.go.th/royalrain/IMG/content/archive/3_CN-235.jpg",
    "BELL": "https://www.royalrain.go.th/royalrain/IMG/content/archive/4_Bell205.jpg",
    "BELL 205": "https://www.royalrain.go.th/royalrain/IMG/content/archive/4_Bell205.jpg",
    "BELL 412": "https://www.royalrain.go.th/royalrain/IMG/content/archive/5_Bell412.jpg",
    "AS350": "https://www.royalrain.go.th/royalrain/IMG/content/archive/6_AS350.jpg",
    "H130": "https://www.royalrain.go.th/royalrain/IMG/content/archive/7_H130.jpg",
    "HELICOPTER": "https://www.royalrain.go.th/royalrain/IMG/content/archive/4_Bell205.jpg"
};

// ฟังก์ชันจัดรูปแบบเวลา (ถ้ายังไม่มีการกำหนด)
if (typeof formatTime !== 'function') {
    function formatTime(timeValue) {
        if (!timeValue) return "0";

        console.log(`formatTime input: ${timeValue} (${typeof timeValue})`);

        // ถ้าเป็นตัวเลขอยู่แล้ว ให้แปลงเป็นสตริง
        if (typeof timeValue === 'number') {
            // แปลงเป็นรูปแบบ HH:MM
            const hours = Math.floor(timeValue);
            // ใช้ Math.floor แทน Math.round เพื่อให้ได้ค่านาทีที่ถูกต้อง
            const minutes = Math.floor((timeValue - hours) * 60);
            const result = `${hours}:${minutes.toString().padStart(2, '0')}`;
            console.log(`  - แปลงจากตัวเลข ${timeValue} เป็น ${result}`);
            return result;
        }

        // ถ้าเป็นสตริง ให้ตรวจสอบรูปแบบ
        if (typeof timeValue === 'string') {
            // ถ้ามีรูปแบบ HH:MM อยู่แล้ว
            if (timeValue.includes(':')) {
                console.log(`  - เป็นรูปแบบ HH:MM อยู่แล้ว: ${timeValue}`);
                return timeValue;
            }

            // ถ้าเป็นตัวเลขในรูปแบบสตริง
            if (!isNaN(timeValue)) {
                const numValue = parseFloat(timeValue);
                const hours = Math.floor(numValue);
                // ใช้ Math.floor แทน Math.round เพื่อให้ได้ค่านาทีที่ถูกต้อง
                const minutes = Math.floor((numValue - hours) * 60);
                const result = `${hours}:${minutes.toString().padStart(2, '0')}`;
                console.log(`  - แปลงจากสตริงตัวเลข ${timeValue} เป็น ${result}`);
                return result;
            }
        }

        // กรณีอื่นๆ ให้คืนค่าเดิม
        console.log(`  - ไม่สามารถแปลงได้ คืนค่าเดิม: ${timeValue}`);
        return timeValue.toString();
    }

    // กำหนดให้เป็นฟังก์ชันระดับ window เพื่อให้ใช้ได้ทั่วไป
    window.formatTime = formatTime;
}

// ฟังก์ชันสกัดชื่อจังหวัดจากข้อความ
function extractProvince(text) {
    if (!text) return "กรุงเทพมหานคร"; // ค่าเริ่มต้น

    // แปลงเป็นสตริงและตัดช่องว่างที่ไม่จำเป็น
    const normalizedText = text.toString().trim();

    // รายชื่อจังหวัดที่ต้องการตรวจสอบ
    const provinces = [
        "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา",
        "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก",
        "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน",
        "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา",
        "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "มหาสารคาม", "มุกดาหาร",
        "แม่ฮ่องสอน", "ยะลา", "ยโสธร", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน",
        "ศรีสะเกษ", "สกลนคร", "สงขลา", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี",
        "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู",
        "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
    ];

    // คำย่อและชื่อเต็มของจังหวัด
    const provinceAliases = {
        "กทม": "กรุงเทพมหานคร",
        "กรุงเทพ": "กรุงเทพมหานคร",
        "กรุงเทพฯ": "กรุงเทพมหานคร",
        "พระนคร": "กรุงเทพมหานคร",
        "นครศรีฯ": "นครศรีธรรมราช",
        "นครราชสีมา": "นครราชสีมา",
        "โคราช": "นครราชสีมา",
        "อยุธยา": "พระนครศรีอยุธยา",
        "สุราษฎร์": "สุราษฎร์ธานี",
        "ประจวบ": "ประจวบคีรีขันธ์",
        "หัวหิน": "ประจวบคีรีขันธ์"
    };

    // ตรวจสอบคำย่อก่อน
    for (const [alias, fullName] of Object.entries(provinceAliases)) {
        if (normalizedText.includes(alias)) {
            return fullName;
        }
    }

    // ตรวจสอบชื่อจังหวัดเต็ม
    for (const province of provinces) {
        if (normalizedText.includes(province)) {
            return province;
        }
    }

    // ถ้าไม่พบจังหวัดใดๆ ให้คืนค่าเริ่มต้น
    return "กรุงเทพมหานคร";
}

// ฟังก์ชันสำหรับอัปเดตรายการเครื่องบิน (เพิ่มเพื่อแก้ไขบัก)
window.updateAircraftList = function(flights = flightData) {
    // เรียกใช้ฟังก์ชัน generateAircraftList เพื่อสร้างรายการเครื่องบินใหม่
    generateAircraftList(flights);
    
    // อัปเดตสถานะสรุป
    const availableCount = flights.filter(flight => 
        flight.status && typeof flight.status === 'string' && flight.status.toLowerCase() === "yes"
    ).length;
    const unavailableCount = flights.filter(flight => 
        !flight.status || typeof flight.status !== 'string' || flight.status.toLowerCase() !== "yes"
    ).length;
    updateStatusSummary(availableCount, unavailableCount);
    
    return flights;
};

// ฟังก์ชันสำหรับเพิ่มวันที่ลงในแคช (เพิ่มเพื่อแก้ไขบัก)
window.addDateToCache = function(date) {
    if (!date) return;
    
    try {
        // ตรวจสอบว่ามีรายการวันที่ที่มีใน cache หรือไม่
        const allDatesKey = 'allCachedDates';
        let cachedDates = [];
        const cachedDatesStr = localStorage.getItem(allDatesKey);
        
        if (cachedDatesStr) {
            try {
                cachedDates = JSON.parse(cachedDatesStr);
            } catch (e) {
                console.error("❌ ไม่สามารถแปลงข้อมูลรายการวันที่ได้:", e);
                cachedDates = [];
            }
        }
        
        // เพิ่มวันที่ใหม่ถ้ายังไม่มีในรายการ
        if (!cachedDates.includes(date)) {
            cachedDates.push(date);
            // เรียงลำดับวันที่
            cachedDates.sort();
            // บันทึกรายการวันที่ลงใน localStorage
            localStorage.setItem(allDatesKey, JSON.stringify(cachedDates));
            console.log(`✅ เพิ่มวันที่ ${date} ลงในแคชแล้ว`);
        }
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการเพิ่มวันที่ลงในแคช:", error);
    }
};
