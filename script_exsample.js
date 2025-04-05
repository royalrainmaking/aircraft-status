document.addEventListener("DOMContentLoaded", async function () {
    console.log("เริ่มต้นแอปพลิเคชัน...");
    try {
        // โหลดข้อมูลก่อน
        await fetchFlightData();
        console.log("โหลดข้อมูลสำเร็จ");

        // สร้างแผนที่
        initMap();
        console.log("เริ่มต้นแผนที่สำเร็จ");

        // ตั้งค่าปุ่มต่างๆ
        setupAircraftListToggle();
        setupRefreshButton();
        setupRippleEffect();

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

let markers = []; // ตัวแปรเก็บข้อมูลมาร์กเกอร์
let positionCounts = {}; // ตัวแปรเก็บจำนวนมาร์กเกอร์ในแต่ละตำแหน่ง

// ฟังก์ชันสำหรับคำนวณตำแหน่งที่ไม่ทับซ้อนกัน
function getOffsetPosition(lat, lng) {
    // ใช้ทศนิยม 4 ตำแหน่งเพื่อจัดกลุ่มตำแหน่งที่ใกล้เคียงกัน
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    const key = `${roundedLat},${roundedLng}`;

    // ถ้ายังไม่มีมาร์กเกอร์ในตำแหน่งนี้ ให้ใช้ตำแหน่งเดิม
    if (!positionCounts[key]) {
        positionCounts[key] = 1;
        return [lat, lng];
    }

    // ถ้ามีมาร์กเกอร์ในตำแหน่งนี้แล้ว ให้จัดเรียงเป็นแถว
    const count = positionCounts[key]++;

    // กำหนดรูปแบบการจัดเรียง
    const maxPerRow = 3; // จำนวนมาร์กเกอร์สูงสุดต่อแถว
    const spacing = 0.003; // ระยะห่างระหว่างมาร์กเกอร์ (ประมาณ 300 เมตร)

    // คำนวณตำแหน่งแถวและคอลัมน์
    const row = Math.floor((count - 1) / maxPerRow);
    const col = (count - 1) % maxPerRow;

    // คำนวณตำแหน่งใหม่
    const newLat = lat + (row * spacing);
    const newLng = lng + (col * spacing) - (spacing * (maxPerRow - 1) / 2);

    console.log(`🔄 ปรับตำแหน่งมาร์กเกอร์ที่ ${key} ลำดับที่ ${count} ไปที่ [${newLat}, ${newLng}]`);

    return [newLat, newLng];
}

// ฟังก์ชันกรองเครื่องบินตามหมายเลขเครื่องบิน, ชื่อเครื่องบิน หรือภารกิจ/ฐานที่ตั้ง
// ฟังก์ชันกรองการค้นหาจากหมายเลขเครื่องบิน, ชื่อเครื่องบิน, หรือภารกิจ/ฐานที่ตั้ง

function showMarkers(filteredFlights) {
    markers.forEach(({ flight, marker }) => {
        if (filteredFlights.some(f => f.aircraftNumber === flight.aircraftNumber)) {
            marker.addTo(map); // แสดงมาร์กเกอร์ที่ตรงกับคำค้นหา
        } else {
            map.removeLayer(marker); // ซ่อนมาร์กเกอร์ที่ไม่ตรงกับคำค้นหา
        }
    });
}


// ฟังก์ชันในการแสดงมาร์กเกอร์ทั้งหมด
function showAllMarkers() {
    markers.forEach(({ marker }) => {
        marker.addTo(map); // แสดงมาร์กเกอร์ทั้งหมด
    });
}

function hideMarkers() {
    markers.forEach(({ marker }) => {
        map.removeLayer(marker); // ซ่อนมาร์กเกอร์ทั้งหมด
    });
}



// ฟังก์ชันกรองการค้นหาจากหมายเลขเครื่องบิน, ชื่อเครื่องบิน, ภารกิจ/ฐานที่ตั้ง, สถานะ หรือข้อมูลอื่นๆ
function filterAircraftByNumberOrNameOrMission(searchTerm) {
    const listContainer = document.getElementById("aircraftList");
    const noResultsMessage = document.getElementById("noResultsMessage");
    const searchWrapper = document.querySelector(".search-wrapper");

    // ถ้าไม่มีคำค้นหา ให้แสดงเครื่องบินทั้งหมด
    if (searchTerm === "") {
        generateAircraftList(flightData);
        listContainer.style.display = "block";
        if (noResultsMessage) noResultsMessage.style.display = "none";
        showAllMarkers();  // แสดง markers ทั้งหมด
        searchWrapper.classList.remove("has-results");
        return;
    }

    // เพิ่มคลาสเพื่อแสดงว่ามีการค้นหา
    searchWrapper.classList.add("has-results");

    // แปลงคำค้นหาเป็นตัวพิมพ์เล็กและตัดช่องว่างที่ไม่จำเป็น
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();

    // คำค้นหาพิเศษสำหรับสถานะ
    const isSearchingForAvailable = ["ใช้งานได้", "available", "yes", "พร้อม", "พร้อมใช้งาน", "✓", "✅"].some(term =>
        normalizedSearchTerm.includes(term));
    const isSearchingForUnavailable = ["ใช้งานไม่ได้", "unavailable", "no", "ไม่พร้อม", "ไม่พร้อมใช้งาน", "✗", "❌"].some(term =>
        normalizedSearchTerm.includes(term));

    // กรองข้อมูลด้วยการค้นหาที่ครอบคลุมมากขึ้น
    const filteredFlights = flightData.filter(flight => {
        // ค้นหาจากหมายเลขเครื่องบิน
        if (flight.aircraftNumber.toLowerCase().includes(normalizedSearchTerm)) return true;

        // ค้นหาจากชื่อเครื่องบิน
        if (flight.name && flight.name.toLowerCase().includes(normalizedSearchTerm)) return true;

        // ค้นหาจากภารกิจ/ฐานที่ตั้ง
        if (flight.missionBase.toLowerCase().includes(normalizedSearchTerm)) return true;

        // ค้นหาจากประเภทเครื่องบิน
        if (flight.aircraftType && flight.aircraftType.toLowerCase().includes(normalizedSearchTerm)) return true;

        // ค้นหาจากสถานะ
        if (isSearchingForAvailable && flight.status === "yes") return true;
        if (isSearchingForUnavailable && flight.status === "no") return true;

        // ค้นหาจากชั่วโมงบิน
        if (flight.flightHours && flight.flightHours.toString().includes(normalizedSearchTerm)) return true;

        // ค้นหาจากหมายเหตุ
        if (flight.note && flight.note.toLowerCase().includes(normalizedSearchTerm)) return true;

        return false;
    });

    // ถ้ามีผลลัพธ์ แสดงรายการใหม่ ถ้าไม่มี ให้ซ่อน
    if (filteredFlights.length > 0) {
        generateAircraftList(filteredFlights);
        listContainer.style.display = "block";
        if (noResultsMessage) noResultsMessage.style.display = "none";
        showMarkers(filteredFlights);  // แสดง markers ที่ตรงกับการค้นหา

        // ลบข้อความเดิมถ้ามี (ไม่แสดงจำนวนผลลัพธ์)
        const oldCount = document.querySelector(".search-result-count");
        if (oldCount) oldCount.remove();
    } else {
        listContainer.style.display = "none";
        if (noResultsMessage) {
            noResultsMessage.style.display = "block";
            noResultsMessage.textContent = `ไม่พบผลลัพธ์สำหรับ "${searchTerm}"`;
        } else {
            // สร้างข้อความแจ้งเตือนถ้ายังไม่มี
            const noResults = document.createElement("div");
            noResults.id = "noResultsMessage";
            noResults.textContent = `ไม่พบผลลัพธ์สำหรับ "${searchTerm}"`;
            noResults.style.textAlign = "center";
            noResults.style.padding = "15px";
            noResults.style.color = "var(--on-surface-medium)";
            listContainer.parentNode.insertBefore(noResults, listContainer.nextSibling);
        }
        hideMarkers();  // ซ่อน markers เมื่อไม่มีผลลัพธ์
    }
}

const provinceCoordinates = {
    "เชียงใหม่": [18.7883, 98.9853],
    "กรุงเทพ": [13.7367, 100.5231],
    "กรุงเทพฯ": [13.7367, 100.5231],
    "ขอนแก่น": [16.4322, 102.8236],
    "ภูเก็ต": [7.8804, 98.3923],
    "อุบลราชธานี": [15.2442, 104.8473],
    "อำนาจเจริญ": [15.8692, 104.6513],
    "อุดรธานี": [17.4138, 102.7914],
    "กาญจนบุรี": [14.0039, 99.5501],
    "นครสวรรค์": [15.7112, 100.1153],
    "กระบี่": [8.0857, 98.9063],
    "นครนายก": [14.0859, 101.2311],
    "นครปฐม": [13.8198, 100.0401],
    "นครราชสีมา": [14.9700, 102.0951],
    "นนทบุรี": [13.9074, 100.5211],
    "นราธิวาส": [6.4281, 101.8214],
    "น่าน": [18.7734, 100.7754],
    "บึงกาฬ": [18.4462, 103.0605],
    "บุรีรัมย์": [14.5381, 103.0964],
    
    "คลองหลวง": [14.119651846368596, 100.62024770985914], 
    "ปทุมธานี": [14.0011, 100.5159],
    "ประจวบคีรีขันธ์": [11.8010, 99.7961],
    "ปราจีนบุรี": [13.9385, 101.4190],
    "พะเยา": [19.1510, 99.9175],
    "พังงา": [8.4225, 98.4878],
    "พัทลุง": [7.6164, 100.0772],
    "พิษณุโลก": [16.8265, 100.2642],
    "เพชรบูรณ์": [16.4537, 101.1859],
    "แพร่": [18.1513, 100.1695],
    "ภาคใต้": [7.3162, 99.9000],
    "มหาสารคาม": [15.3836, 103.2956],
    "มุกดาหาร": [16.5400, 104.7107],
    "แม่ฮ่องสอน": [19.3033, 97.9825],
    "ลำพูน": [18.5785, 98.5314],
    "ลำปาง": [18.2923, 99.5082],
    "เลย": [17.4865, 101.7353],
    "ศรีสะเกษ": [15.1228, 104.3245],
    "สกลนคร": [17.1597, 104.1454],
    "สงขลา": [7.1735, 100.5960],
    "สมุทรปราการ": [13.6043, 100.6010],
    "สมุทรสาคร": [13.5659, 100.2833],
    "สระแก้ว": [13.8251, 102.0691],
    "สระบุรี": [14.5313, 100.8839],
    "สุโขทัย": [17.0003, 99.8190],
    "สุพรรณบุรี": [14.4696, 100.1135],
    "สุราษฎร์ธานี": [9.1406, 99.3258],
    "สุรินทร์": [14.8666, 103.4899],
    "หนองคาย": [17.8707, 102.7415],
    "หนองบัวลำภู": [17.2137, 102.4067],
    "เชียงราย": [19.9124, 99.8223],
    "เพชรบุรี": [12.9687, 99.9573],
    "ระนอง": [9.9385, 98.6293],
    "ราชบุรี": [13.5427, 99.8151],
    "ลพบุรี": [14.8027, 100.6116],
    "สตูล": [7.6014, 99.9786],
    "สมุทรสงคราม": [13.4149, 99.9803]
};

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


// ฟังก์ชันที่ใช้จัดการกับข้อมูลเวลา คงรูปแบบ 00:00 ไว้
function formatTime(timeString) {
    try {
        if (!timeString) {
            return "";  // คืนค่าว่างถ้าไม่มีข้อมูล
        }

        // แปลงเป็น string ก่อน
        const str = timeString.toString().trim();

        // ถ้าเป็นค่าว่างหรือ "0" ให้คืนค่าว่าง
        if (str === "" || str === "0") {
            return "";
        }

        // คืนค่าเดิมโดยไม่แปลงรูปแบบ
        return str;
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการจัดรูปแบบเวลา:", error);
        return "";
    }
}

// ฟังก์ชันแปลงเวลาในรูปแบบ HH:MM เป็นชั่วโมงทศนิยม
function convertTimeToDecimal(timeString) {
    if (!timeString) return 0;

    // ถ้าเป็นตัวเลขอยู่แล้ว
    if (!isNaN(timeString)) {
        return parseFloat(timeString);
    }

    // ถ้าเป็นรูปแบบ HH:MM
    if (timeString.includes(':')) {
        const parts = timeString.split(':');
        if (parts.length === 2) {
            const hours = parseFloat(parts[0]) || 0;
            const minutes = parseFloat(parts[1]) || 0;
            return hours + (minutes / 60);
        }
    }

    // ถ้าไม่ตรงกับรูปแบบใดๆ
    return parseFloat(timeString) || 0;
}

// ฟังก์ชันแปลงชั่วโมงทศนิยมเป็นรูปแบบ HH:MM
function formatDecimalToTime(decimalHours) {
    if (decimalHours === 0) return "0";

    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);

    if (minutes === 60) {
        return `${hours + 1}:00`;
    }

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

// ฟังก์ชันตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
function checkIsMobile() {
    return window.innerWidth <= 768;
}

// ฟังก์ชันสำหรับการแสดงรายการเครื่องบิน
function generateAircraftList(filteredFlights = flightData) {
    const listContainer = document.getElementById('aircraftList');
    listContainer.innerHTML = ""; // ล้างรายการเดิม

    let availableCount = 0;
    let unavailableCount = 0;

    // ตรวจสอบว่ามีข้อมูลหรือไม่
    if (filteredFlights.length === 0) {
        listContainer.innerHTML = "<p class='no-results'>❌ ไม่พบเครื่องบินที่ตรงกับการค้นหา</p>";

        // อัปเดตสรุปจำนวนเครื่องบิน
        updateStatusSummary(0, 0);
        return;
    }

    // ตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
    const isMobile = checkIsMobile();

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

        if (flight.status.toLowerCase() === "yes") {
            statusIcon.classList.add("green");
            availableCount++;
        } else {
            statusIcon.classList.add("red");
            unavailableCount++;
        }

        // สร้างข้อความแสดงชื่อและหมายเลขเครื่องบิน
        const nameSpan = document.createElement('span');

        if (isMobile) {
            // สำหรับมือถือ แสดงประเภทเครื่องบินและหมายเลขเครื่องบิน
            nameSpan.textContent = `${flight.name} ${flight.aircraftNumber}`;

            // ปรับขนาดรายการให้เล็กลงสำหรับมือถือ
            listItem.style.padding = '8px 10px';
            listItem.style.marginBottom = '5px';
            listItem.style.fontSize = '14px';
            listItem.style.height = 'auto';
            listItem.style.minHeight = '24px';
        } else {
            // สำหรับเดสก์ท็อป แสดงทั้งชื่อและหมายเลขเครื่องบิน
            nameSpan.textContent = `${flight.name} (${flight.aircraftNumber})`;
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
                // ไม่ต้องแสดงข้อความนี้แล้ว

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

// ฟังก์ชันอัปเดตสรุปสถานะ
function updateStatusSummary(availableCount, unavailableCount) {
    // ตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
    const isMobile = checkIsMobile();

    // อัปเดตข้อความในแต่ละสถานะ
    const availableText = document.querySelector('#statusSummary p:first-child');
    const unavailableText = document.querySelector('#statusSummary p:last-child');

    if (isMobile) {
        // สำหรับมือถือ แสดงเฉพาะไอคอนและตัวเลข
        availableText.innerHTML = `
            <span class="status-icon-text">✅</span>
            <span class="green" data-count="${availableCount}"></span>
        `;

        unavailableText.innerHTML = `
            <span class="status-icon-text">❌</span>
            <span class="red" data-count="${unavailableCount}"></span>
        `;
    } else {
        // สำหรับเดสก์ท็อป แสดงทั้งข้อความและตัวเลข
        availableText.innerHTML = `
            ✅ ใช้งานได้ <span class="count-text">(${availableCount})</span>
            <span class="green" data-count="${availableCount}"></span>
        `;

        unavailableText.innerHTML = `
            ❌ ใช้งานไม่ได้ <span class="count-text">(${unavailableCount})</span>
            <span class="red" data-count="${unavailableCount}"></span>
        `;
    }

    // เพิ่ม animation เมื่อมีการอัปเดตจำนวน
    const greenSpan = document.querySelector('#statusSummary .green');
    const redSpan = document.querySelector('#statusSummary .red');

    greenSpan.classList.add('pulse');
    redSpan.classList.add('pulse');

    // ลบคลาส animation หลังจากเล่นเสร็จ
    setTimeout(() => {
        greenSpan.classList.remove('pulse');
        redSpan.classList.remove('pulse');
    }, 1000);

    // เพิ่ม event listener สำหรับการเปลี่ยนขนาดหน้าจอ
    window.addEventListener('resize', function() {
        updateStatusSummary(availableCount, unavailableCount);
    });
}




async function fetchFlightData() {
    const sheetID = "1_M74Pe_4uul0fkcEea8AMxQIMcPznNZ9ttCqvbeQgBs";
    const aircraftSheetGID = "705816349";

    const aircraftURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${aircraftSheetGID}`;

    // กำหนดเวลาหมดอายุของข้อมูล (5 นาที)
    const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 นาที เป็นมิลลิวินาที

    // ตรวจสอบว่ามีข้อมูลใน localStorage หรือไม่
    const cachedData = localStorage.getItem('flightDataCache');
    const cachedTimestamp = localStorage.getItem('flightDataTimestamp');
    const currentTime = new Date().getTime();

    // ถ้ามีข้อมูลใน cache และยังไม่หมดอายุ ให้ใช้ข้อมูลจาก cache
    if (cachedData && cachedTimestamp && (currentTime - parseInt(cachedTimestamp) < CACHE_EXPIRATION)) {
        console.log("📋 ใช้ข้อมูลจาก cache...");
        flightData.length = 0;
        const parsedData = JSON.parse(cachedData);
        parsedData.forEach(item => flightData.push(item));
        console.log("✅ โหลดข้อมูลจาก cache สำเร็จ:", flightData.length, "รายการ");
        generateAircraftList();

        // โหลดข้อมูลใหม่ในพื้นหลังเพื่ออัปเดต cache
        setTimeout(() => {
            refreshDataInBackground();
        }, 1000);

        return;
    }

    // ถ้าไม่มีข้อมูลใน cache หรือข้อมูลหมดอายุแล้ว ให้โหลดข้อมูลใหม่
    try {
        await loadDataFromSheets();
    } catch (error) {
        console.error("❌ โหลดข้อมูลไม่สำเร็จ:", error);

        // ถ้าโหลดข้อมูลใหม่ไม่สำเร็จ แต่มีข้อมูลเก่าใน cache ให้ใช้ข้อมูลเก่า
        if (cachedData) {
            console.log("⚠️ ใช้ข้อมูลเก่าจาก cache แทน...");
            flightData.length = 0;
            const parsedData = JSON.parse(cachedData);
            parsedData.forEach(item => flightData.push(item));
            generateAircraftList();
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
        const response = await fetch(aircraftURL);
        const text = await response.text();
        const json = JSON.parse(text.substring(47, text.length - 2));

        flightData.length = 0;

        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (json && json.table && json.table.rows && json.table.rows.length > 0) {
            // ดึงเฉพาะแถวสุดท้ายของข้อมูล
            const lastRow = json.table.rows[json.table.rows.length - 1];

            console.log(`📊 ดึงข้อมูลแถวสุดท้ายจาก Google Sheets สำเร็จ`);

            // รีเซ็ตตัวนับตำแหน่ง
            for (let key in positionCounts) {
                delete positionCounts[key];
            }

            // ประมวลผลข้อมูลแถวสุดท้าย
            processLastRowData(lastRow);
        }

        // บันทึกข้อมูลลงใน localStorage
        localStorage.setItem('flightDataCache', JSON.stringify(flightData));
        localStorage.setItem('flightDataTimestamp', currentTime.toString());

        console.log("✅ ข้อมูลอัปเดตแล้ว:", flightData.length, "รายการ");
        generateAircraftList();
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

        console.log("🔄 เริ่มประมวลผลข้อมูลเครื่องบินจำนวน", aircraftArray.length, "รายการ");

             // วนลูปเพื่อเพิ่มข้อมูลเครื่องบินแต่ละลำ
        aircraftArray.forEach((aircraft, index) => {
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
                    remainingHours = formatTime(aircraft["ชั่วโมง"] || "0");
                    engineLH = formatTime(aircraft["ชั่วโมงเครื่องยนต์ ย1"] || "0");
                    engineRH = formatTime(aircraft["ชั่วโมงเครื่องยนต์ ย2"] || "0");

                    // ตรวจสอบชั่วโมงบินคงเหลือครบซ่อมทั้ง 3 ค่า
                    const hours100 = formatTime(aircraft["ชั่วโมงบินคงเหลือครบซ่อม 100"] || "0");
                    const hours150 = formatTime(aircraft["ชั่วโมงบินคงเหลือครบซ่อม 150"] || "0");
                    const hours300 = formatTime(aircraft["ชั่วโมงบินคงเหลือครบซ่อม 300"] || "0");
                        
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
                    remainingHours = formatTime(aircraft["ชั่วโมงเครื่องบิน"] || "");

                    // ตรวจสอบชื่อคอลัมน์ที่ถูกต้อง (อาจมีช่องว่างท้ายชื่อ)
                    const keys = Object.keys(aircraft);
                    const flightHoursKey = keys.find(key => key.includes("ชั่วโมงเครื่องบิน"));
                    const aCheckKey = keys.find(key => key.includes("A cHEcK"));

                    console.log(`🔍 ข้อมูลดิบจาก JSON สำหรับ ${aircraftNumber}:`);
                    console.log(`   - ชื่อคอลัมน์ที่พบ: ชั่วโมงเครื่องบิน = "${flightHoursKey}", A cHEcK = "${aCheckKey}"`);

                    // อ่านค่าจากคอลัมน์ที่พบ
                    const rawFlightHours = flightHoursKey ? aircraft[flightHoursKey] : "";
                    const rawACheck = aCheckKey ? aircraft[aCheckKey] : "";

                    console.log(`   - ค่าที่อ่านได้: ชั่วโมงเครื่องบิน = "${rawFlightHours}", A cHEcK = "${rawACheck}"`);

                    // เก็บค่าชั่วโมงเครื่องบินและ A CHECK
                    remainingHours = formatTime(rawFlightHours || "");
                    aCheck = formatTime(rawACheck || "");

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

                            console.log(`   - การคำนวณ: ${aCheck} - ${remainingHours} = ${aCheckDue} (${aCheckValue} - ${flightHoursValue} = ${difference})`);
                        } catch (error) {
                            console.error(`❌ เกิดข้อผิดพลาดในการคำนวณค่าครบซ่อม:`, error);
                            aCheckDue = "";
                        }
                    } else {
                        aCheckDue = "";
                    }

                    console.log(`   - ค่าหลังจัดรูปแบบ: remainingHours = "${remainingHours}", aCheck = "${aCheck}", aCheckDue = "${aCheckDue}"`);

                    // ตรวจสอบค่าเครื่องยนต์
                    engineLH = formatTime(aircraft["No.1 /LH"] || "");
                    engineRH = formatTime(aircraft["No.2 /RH"] || "");
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

                console.log(`🔍 กำลังประมวลผลข้อมูล: ${name} (${aircraftNumber})`);

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

                // เพิ่มข้อมูลเข้าไปในอาร์เรย์
                flightData.push(flight);

                console.log(`✅ ประมวลผลข้อมูลเครื่องบินลำดับที่ ${index + 1} สำเร็จ: ${flight.name} (${flight.aircraftNumber})`);
            } catch (error) {
                console.error(`❌ เกิดข้อผิดพลาดในการประมวลผลข้อมูลเครื่องบินลำดับที่ ${index + 1}:`, error);
            }
        });

        console.log(`✅ ประมวลผลข้อมูลเครื่องบินทั้งหมดสำเร็จ จำนวน ${flightData.length} รายการ`);
    }

    // ฟังก์ชันแปลงค่าที่ได้รับเป็นฟอร์แมต "xx:xx" โดยไม่คำนวณ
    function convertToTimeFormat(value) {
        try {
            if (value === undefined || value === null) {
                return "0";
            }

            // แปลงตัวเลขเป็นชั่วโมง:นาที
            let timeValue = value.toString();

            if (timeValue.includes(':')) {
                // ถ้ามีการใช้ ":", จะตัดแค่ส่วนที่เป็นชั่วโมงและนาที
                return timeValue.split(':').slice(0, 2).join(':');
            }

            // ตรวจสอบว่าเป็นตัวเลขหรือไม่
            if (!isNaN(parseFloat(timeValue))) {
                return timeValue;
            }

            return "0"; // ถ้าไม่ใช่ตัวเลข
        } catch (error) {
            console.error("❌ เกิดข้อผิดพลาดในการแปลงรูปแบบเวลา:", error);
            return "0";
        }
    }
}



function formatHours(value) {
    if (!value) return "N/A";
    return value.replace(/:00$/, "");
}

function extractProvince(text) {
    try {
        if (!text) {
            return "กรุงเทพฯ"; // ค่าเริ่มต้นถ้าไม่มีข้อความ
        }

        const textLower = text.toString().toLowerCase();

        // ตรวจสอบว่ามีชื่อจังหวัดในข้อความหรือไม่
        for (let province in provinceCoordinates) {
            const provinceLower = province.toLowerCase();
            if (textLower.includes(provinceLower)) {
                console.log(`🗺️ พบจังหวัด "${province}" ในข้อความ "${text}"`);
                return province;
            }
        }

        // ถ้าไม่พบจังหวัดใดๆ ให้ใช้ค่าเริ่มต้น
        console.log(`⚠️ ไม่พบจังหวัดในข้อความ "${text}" จะใช้ค่าเริ่มต้น "กรุงเทพฯ"`);
        return "กรุงเทพฯ";
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการแยกชื่อจังหวัด:", error);
        return "กรุงเทพฯ";
    }
}

// ตัวแปรเก็บข้อมูลการจัดเรียงเครื่องบินในแต่ละตำแหน่ง
const positionArrangements = {};

// ฟังก์ชันนี้ถูกแทนที่ด้วย getOffsetPosition แต่ยังคงไว้เพื่อความเข้ากันได้กับโค้ดเดิม
function addJitter([lat, lng]) {
    // ใช้ฟังก์ชัน getOffsetPosition แทน
    return getOffsetPosition(lat, lng);
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
    if (!map) {
        console.error("ไม่พบแผนที่ในฟังก์ชัน updateMapMarkers");
        return;
    }

    // ลบมาร์กเกอร์เดิมทั้งหมด
    markers.forEach(({ marker }) => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });

    // รีเซ็ตอาร์เรย์มาร์กเกอร์
    markers = [];

    // รีเซ็ตตัวนับตำแหน่งเพื่อจัดเรียงมาร์กเกอร์ใหม่
    for (let key in positionCounts) {
        delete positionCounts[key];
    }

    // เพิ่มมาร์กเกอร์ใหม่สำหรับทุกเครื่องบิน
    flightData.forEach(flight => {
        // ตรวจสอบว่าข้อมูลถูกต้องหรือไม่
        if (!flight || typeof flight !== 'object') {
            console.warn("พบข้อมูลเครื่องบินที่ไม่ถูกต้อง:", flight);
            return;
        }

        // ตรวจสอบว่ามีพิกัดหรือไม่
        if (!flight.latitude || !flight.longitude) {
            console.warn(`ไม่พบพิกัดสำหรับเครื่องบิน ${flight.aircraftNumber}`);
            return;
        }

        // กำหนดไอคอนตามประเภทเครื่องบิน
        const isHelicopter = flight.type === "helicopter";
        const iconUrl = isHelicopter ? "helicopter.svg" : "airplane.svg";

        // กำหนดสีตามสถานะ
        const status = flight.status || "no";
        const shadowColor = (status.toString().toLowerCase() === "yes")
            ? "#34c759"  // สีเขียวสำหรับใช้งานได้ (ใช้ iOS green color)
            : "#ff3b30";  // สีแดงสำหรับใช้งานไม่ได้ (ใช้ iOS red color)

        // สร้างไอคอนแบบกำหนดเอง
        const vehicleIcon = L.divIcon({
            className: 'custom-icon',  // ตั้งคลาส CSS เพื่อจัดการสไตล์
            html: `<div class="marker-container">
                    <div class="marker-status" style="background-color: ${shadowColor}"></div>
                    <img src="${iconUrl}" class="marker-image">
                    <div class="marker-label">${String(flight.aircraftNumber || "").split(' ').pop() || String(flight.aircraftNumber || "")}</div>
                  </div>`,
            iconSize: [40, 65], // เพิ่มความสูงเพื่อให้มีพื้นที่สำหรับ label
            iconAnchor: [20, 30],
            popupAnchor: [0, -30]
        });

        // คำนวณตำแหน่งที่ไม่ทับซ้อนกัน
        const [offsetLat, offsetLng] = getOffsetPosition(flight.latitude, flight.longitude);

        // สร้างมาร์กเกอร์และเพิ่มลงในแผนที่
        const marker = L.marker([offsetLat, offsetLng], { icon: vehicleIcon })
            .addTo(map)
            // ไม่ต้องใช้ tooltip เพราะเรามี label ที่แสดงเมื่อ hover แล้ว
            .on('click', function() {
                try {
                    // ตรวจสอบว่ามีข้อมูลเครื่องบินหรือไม่
                    if (!flight) {
                        console.error("ไม่พบข้อมูลเครื่องบิน");
                        return;
                    }

                    // ไม่ต้องแสดงข้อความนี้แล้ว
                    window.updateSidebar(flight);
                } catch (error) {
                    console.error("เกิดข้อผิดพลาดในการอัปเดต sidebar จากมาร์กเกอร์:", error);
                    console.error("รายละเอียดข้อผิดพลาด:", error.message);
                    console.error("Stack trace:", error.stack);
                }
            });

        // เพิ่มมาร์กเกอร์ลงในอาร์เรย์
        markers.push({ flight, marker });
    });

    // ไม่ต้องแสดงข้อความนี้แล้ว
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
            markers.forEach(function(markerObj) {
                markerObj.marker.remove(); // ลบมาร์กเกอร์
            });
            markers = []; // รีเซ็ต array ของมาร์กเกอร์

            // รีเซ็ตตัวนับตำแหน่งเพื่อจัดเรียงมาร์กเกอร์ใหม่
            positionCounts = {}; // รีเซ็ตตัวนับตำแหน่ง

            // หากต้องการให้ลิสรายการเครื่องบินแสดงทั้งหมดเมื่อเคลียร์การค้นหา
            generateAircraftList(flightData);

            // เพิ่มมาร์กเกอร์ใหม่ทั้งหมดที่แผนที่
            flightData.forEach(flight => {
                const isHelicopter = flight.type === "helicopter";
                const iconUrl = isHelicopter ? "helicopter.svg" : "airplane.svg";
                const shadowColor = flight.status.toUpperCase() === "YES" 
                    ? "rgb(4, 172, 54)"
                    : "rgba(255, 0, 0, 1)";

                const vehicleIcon = L.divIcon({
                    className: 'custom-icon',
                    html: `<div class="marker-container">
                            <div class="marker-status" style="background-color: ${shadowColor}"></div>
                            <img src="${iconUrl}" class="marker-image">
                            <div class="marker-label">${String(flight.aircraftNumber || "").split(' ').pop() || String(flight.aircraftNumber || "")}</div>
                          </div>`,
                    iconSize: [40, 65], // เพิ่มความสูงเพื่อให้มีพื้นที่สำหรับ label
                    iconAnchor: [20, 30],
                    popupAnchor: [0, -30]
                });

                // คำนวณตำแหน่งที่ไม่ทับซ้อนกัน
                const [offsetLat, offsetLng] = getOffsetPosition(flight.latitude, flight.longitude);

                const marker = L.marker([offsetLat, offsetLng], { icon: vehicleIcon })
                    .addTo(map)
                    // ไม่ต้องใช้ tooltip เพราะเรามี label ที่แสดงเมื่อ hover แล้ว
                    .on('click', function () {
                        console.log("กำลังอัปเดต sidebar จากมาร์กเกอร์สำหรับเครื่องบิน:", String(flight.name || ""), String(flight.aircraftNumber || ""));
                        window.updateSidebar(flight);
                    });

                markers.push({ flight, marker });
            });
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
    if (flight.name.toUpperCase() === "CARAVAN") {
        maxHours = 100;  // สำหรับ CARAVAN ใช้ 100 ชั่วโมง
    }
    else if (flight.name.toUpperCase() === "CN-235") {
        maxHours = 200;  // สำหรับ CN-235 ใช้ 200 ชั่วโมง
    }
    else if (flight.name.toUpperCase() === "SKA350") {
        maxHours = 100;  // สำหรับ SKA350 ใช้ 100 ชั่วโมง
    }

    // เช็คหากเป็นเฮลิคอปเตอร์และปรับ maxHours
    if (flight.type === 'helicopter') {
        // ใช้ฟังก์ชัน getValidACheck เพื่อคำนวณ maxHours สำหรับเฮลิคอปเตอร์
        let column = await HgetValidACheck(flight.aircraftNumber);  // ใช้ฟังก์ชันนี้เพื่อตรวจสอบค่าในคอลัมน์ H, I, J

        // ตรวจสอบค่าที่ได้จากคอลัมน์และกำหนด maxHours ตามลำดับ
        if (column === 7) {  // ถ้าเจอคอลัมน์ H (7)
            maxHours = 100;   // กำหนดให้ maxHours = 100
        } else if (column === 8) {  // ถ้าเจอคอลัมน์ I (8)
            maxHours = 150;   // กำหนดให้ maxHours = 150
        } else if (column === 9) {  // ถ้าเจอคอลัมน์ J (9)
            maxHours = 300;   // กำหนดให้ maxHours = 300
        }
    }
    // แสดงค่า aCheckDue โดยตรง
    console.log(`✅ ข้อมูล A Check สำหรับ ${flight.name} ${flight.aircraftNumber}:`);
    console.log(`   - aCheck = "${flight.aCheck}" (${typeof flight.aCheck})`);
    console.log(`   - aCheckDue = "${flight.aCheckDue}" (${typeof flight.aCheckDue})`);
    console.log(`   - maxHours = ${maxHours} ชั่วโมง`);

    // คำนวณเปอร์เซ็นต์จาก aCheckDue และ maxHours
    let aCheckPercentage = 0;

    try {
        if (flight.aCheckDue && maxHours) {
            // แปลงค่า aCheckDue เป็นตัวเลข
            const aCheckDueValue = convertTimeToDecimal(flight.aCheckDue);

            // คำนวณเปอร์เซ็นต์ (100 - ค่าที่ได้)
            const rawPercentage = Math.round((aCheckDueValue / maxHours) * 100);
            aCheckPercentage = 100 - rawPercentage;

            // ตรวจสอบให้อยู่ในช่วง 0-100
            aCheckPercentage = Math.max(0, Math.min(100, aCheckPercentage));

            console.log(`✅ คำนวณเปอร์เซ็นต์: 100 - (${flight.aCheckDue} / ${maxHours} * 100) = ${aCheckPercentage}%`);
        }
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการคำนวณเปอร์เซ็นต์:", error);
        aCheckPercentage = 0;
    }

    // สถานะการใช้งาน
    const isAvailable = flight.status.toLowerCase() === "yes";
    const statusText = isAvailable ? "พร้อมใช้งาน" : "ไม่พร้อมใช้งาน";
    const statusClass = isAvailable ? "status-available" : "status-unavailable";
    const statusIcon = isAvailable ? "fa-check-circle" : "fa-exclamation-triangle";
    const statusColor = isAvailable ? "#28a745" : "#dc3545";
    const statusGradient = isAvailable ?
        "linear-gradient(to right, #28a745, #20c997)" :
        "linear-gradient(to right, #dc3545, #e83e8c)";

    sidebarContent.innerHTML = `
        <button class="close-btn" onclick="closeSidebar()">
            <i class="fas fa-times"></i>
        </button>

        <div class="status-card">
            <div class="status-content" style="background: ${statusGradient}; color: white;">
                <div class="status-icon">
                    <i class="fas ${statusIcon}"></i>
                </div>
                <div class="status-text">${statusText}</div>
            </div>
        </div>

        <div class="sidebar-header">
            <h2 class="popup-title">${flight.name}</h2>
            <div class="aircraft-number">${flight.aircraftNumber}</div>
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
            <div class="info-card-content">
                <div class="maintenance-card">
                    <div class="maintenance-header">
                        <div class="maintenance-title">
                            <i class="fas fa-tools"></i>
                            <span>ข้อมูลซ่อมบำรุง</span>
                        </div>
                    </div>

                    <div class="maintenance-percentage-container">
                        <div class="circular-progress-container">
                            <div class="circular-progress" data-percentage="${aCheckPercentage}" data-color="${aCheckPercentage > 50 ? '#dc3545' : '#28a745'}">
                                <div class="inner-circle">
                                    <span class="percentage">${aCheckPercentage}%</span>
                                    <span class="text">ครบซ่อม</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="maintenance-info">
                        <div class="maintenance-info-item">
                            <span class="info-label">ครบซ่อม:</span>
                            <span class="info-value">${flight.aCheckDue || 'ไม่ระบุ'}</span>
                        </div>
                        <div class="maintenance-info-item">
                            <span class="info-label">เป้าหมาย:</span>
                            <span class="info-value">${maxHours} ชั่วโมง</span>
                        </div>
                    </div>
                </div>

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

async function HgetValidACheck(aircraftNumber) {
    const sheetID = "1_M74Pe_4uul0fkcEea8AMxQIMcPznNZ9ttCqvbeQgBs";  // ID ของชีตคุณ
    const helicopterSheetGID = "1621250589";  // GID ของแผ่นที่คุณต้องการดึงข้อมูล
    const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${helicopterSheetGID}`;
    try {
        const response = await fetch(url);
        const text = await response.text();
        const json = JSON.parse(text.substring(47, text.length - 2));

    //console.log("Data from Google Sheets:", json.table.rows);  // ดูข้อมูลที่ได้รับจาก Google Sheets
        
        // ลูปค้นหาข้อมูลที่ตรงกับหมายเลขเครื่องบิน
        for (let row of json.table.rows) {
            const aircraft = row.c[2]?.v;  // สมมติว่าหมายเลขเครื่องบินอยู่ในคอลัมน์แรก

            console.log(`Checking row for aircraft: ${aircraft}`);  // log ค่าหมายเลขเครื่องบินในแถวที่กำลังตรวจสอบ

            if (aircraft && aircraft.toString().trim() === aircraftNumber.toString().trim()) {
                // ค้นหาคอลัมน์ H, I, J เพื่อนำ maxHours มาใช้
                for (let col = 7; col <= 9; col++) {
                    let value = row.c[col]?.v;
                    console.log(`Found maxHours in column ${col}: ${value}`);  // log ค่า maxHours ที่พบ    
                    if (value && value !== '-' && value !== '_') {
                        console.log(`Found maxHours in column ${col}: ${value}`);  // log ค่า maxHours ที่พบ
                        return col;  // คืนค่าที่พบในคอลัมน์ที่มีข้อมูล
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
    }
    
    return 150;  // หากไม่พบค่ากำหนดเป็นค่าเริ่มต้น
}













function getStatusGradient(status) {
    if (status === "yes") {
        return 'linear-gradient(135deg, #28a745, #218838)';
    } else if (status === "no") {
        return 'linear-gradient(135deg, #dc3545, #c82333)';
    }
    return 'linear-gradient(135deg, #dc3545, #c82333)';
}

function closeSidebar() {
    document.getElementById('sidebar').style.display = 'none';
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeSidebar();
    }
});







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

// ฟังก์ชัน updateMapMarkers ถูกย้ายไปด้านบนแล้ว

// ฟังก์ชันบังคับโหลดข้อมูลใหม่
async function forceRefreshData() {
    try {
        console.log("🔄 กำลังบังคับโหลดข้อมูลใหม่จาก Google Sheets...");

        // แสดงข้อความกำลังโหลด
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = "กำลังโหลดข้อมูล...";
            statusElement.style.display = "block";
        }

        // ลบข้อมูล cache เดิม
        localStorage.removeItem('flightDataCache');
        localStorage.removeItem('flightDataTimestamp');

        // ล้างข้อมูลเครื่องบินเดิม
        flightData.length = 0;

        // ล้างมาร์กเกอร์เดิม
        if (markers && markers.length > 0) {
            markers.forEach(({ marker }) => {
                if (map && map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            });
            markers = [];
        }

        // โหลดข้อมูลใหม่
        await fetchFlightData();

        console.log("✅ โหลดข้อมูลใหม่สำเร็จ:", flightData.length, "รายการ");

        // สร้างรายการเครื่องบินใหม่
        generateAircraftList();

        // อัปเดตมาร์กเกอร์บนแผนที่
        if (typeof updateMapMarkers === 'function') {
            updateMapMarkers();
        }

        // ซ่อนข้อความกำลังโหลด
        if (statusElement) {
            statusElement.style.display = "none";
        }

        return true; // คืนค่า true เมื่อสำเร็จ
    } catch (error) {
        console.error("❌ ไม่สามารถรีเฟรชข้อมูลได้:", error);

        // แสดงข้อความผิดพลาด
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
            statusElement.style.display = "block";

            // ซ่อนข้อความหลังจาก 3 วินาที
            setTimeout(() => {
                statusElement.style.display = "none";
            }, 3000);
        }

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


