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
    "อุทัยธานี": [15.3796, 99.9066] // ไม่มีสนามบิน
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


// ฟังก์ชันที่ใช้ตัด :00 ออกจากข้อมูล
function formatTime(timeString) {
    if (timeString && timeString.includes(":00")) {
        return timeString.slice(0, -3);
    }
    return timeString;
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
    const aircraftSheetGID = "0";
    const helicopterSheetGID = "1621250589";

    const aircraftURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${aircraftSheetGID}`;
    const helicopterURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${helicopterSheetGID}`;

    // กำหนดเวลาหมดอายุของข้อมูล (30 นาที)
    const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 นาที เป็นมิลลิวินาที

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
        console.log("📡 กำลังโหลดข้อมูลเครื่องบิน...");
        const aircraftResponse = await fetch(aircraftURL);
        const aircraftText = await aircraftResponse.text();
        const aircraftJson = JSON.parse(aircraftText.substring(47, aircraftText.length - 2));

        console.log("📡 กำลังโหลดข้อมูลเฮลิคอปเตอร์...");
        const helicopterResponse = await fetch(helicopterURL);
        const helicopterText = await helicopterResponse.text();
        const helicopterJson = JSON.parse(helicopterText.substring(47, helicopterText.length - 2));

        flightData.length = 0;

        processSheetData(aircraftJson.table.rows, "aircraft");
        processSheetData(helicopterJson.table.rows, "helicopter");

        // บันทึกข้อมูลลงใน localStorage
        localStorage.setItem('flightDataCache', JSON.stringify(flightData));
        localStorage.setItem('flightDataTimestamp', currentTime.toString());

        console.log("✅ ข้อมูลอัปเดตแล้ว:", flightData.length, "รายการ");
        generateAircraftList();
    }

    function processSheetData(rows, type) {
        // รีเซ็ตตัวนับตำแหน่งเมื่อเริ่มประมวลผลข้อมูลใหม่
        if (type === "aircraft") {
            // รีเซ็ตเฉพาะเมื่อเริ่มประมวลผลข้อมูลเครื่องบิน (ก่อนเฮลิคอปเตอร์)
            // ล้างข้อมูลเก่าทั้งหมด
            for (let key in positionCounts) {
                delete positionCounts[key];
            }
        }

        rows.forEach(row => {
            let missionBase = (type === "helicopter" ? (row.c[10]?.v || "").toString() : (row.c[9]?.v || "").toString());
            let maintenanceManager = (type === "helicopter" ? (row.c[11]?.v || "").toString() : (row.c[10]?.v || "").toString());
            let note = (type === "helicopter" ? (row.c[12]?.v || "").toString() : (row.c[11]?.v || "").toString());

            let province = extractProvince(missionBase);
            let coordinates = provinceCoordinates[province] || [13.7367, 100.5231];

            // ตรวจสอบหมายเลขเครื่องบิน
            const aircraftNumber = (row.c[2]?.v || "").toString();

            // แก้ไขปัญหาเฉพาะสำหรับเครื่องบินหมายเลข 1911
            let jitteredCoordinates;
            if (aircraftNumber === "1911") {
                // ใช้ตำแหน่งเดิมโดยไม่มีการเพิ่ม jitter
                jitteredCoordinates = coordinates;
            } else {
                // ใช้ jitter ตามปกติสำหรับเครื่องบินอื่น
                jitteredCoordinates = addJitter(coordinates);
            }

            let status = (row.c[3]?.v || "").toString();  // ใช้คอลัมน์ D สำหรับสถานะ

            // ตรวจสอบสถานะไม่ใช่ "วันนี้" และประเภทเป็น "aircraft" หรือ "helicopter"
            if (status !== "วันนี้") {
                let remainingHours = formatTime(row.c[4]?.v || ""); // ชั่วโมงบินคงเหลือ
                let engineLH = (type === "helicopter" ? formatTime(row.c[5]?.v || "") : formatTime(row.c[7]?.v || ""));
                let engineRH = (type === "helicopter" ? formatTime(row.c[6]?.v || "") : formatTime(row.c[8]?.v || ""));

                let aCheck = type === "helicopter" ? getValidACheck(row) : formatTime(row.c[6]?.v || ""); // สำหรับเฮลิคอปเตอร์จะดูคอลัมน์ H, I, J

                // สร้างข้อมูลสำหรับการแสดงผล
                let flight = {
                    id: (row.c[2]?.v || "").toString(),
                    name: (row.c[1]?.v || "").toString(),
                    aircraftNumber: (row.c[2]?.v || "").toString(),
                    status: status,
                    remainingHours: remainingHours,
                    engineLH: engineLH,
                    engineRH: engineRH,
                    missionBase: missionBase,
                    maintenanceManager: maintenanceManager,
                    note: note,
                    aCheck: aCheck, // แสดงครบซ่อม A Check
                    latitude: jitteredCoordinates[0],
                    longitude: jitteredCoordinates[1],
                    type: type  // แยกประเภทเครื่องบินและเฮลิคอปเตอร์
                };

                flightData.push(flight);
            }
        });
    }

    // ฟังก์ชันสำหรับการตรวจสอบค่าที่มีความหมายจากคอลัมน์ H, I, J (เฉพาะเฮลิคอปเตอร์)
    function getValidACheck(row) {
        // ค้นหาค่าที่เป็นตัวเลขจากคอลัมน์ H (7), I (8), J (9)
        for (let col = 7; col <= 9; col++) {
            let value = row.c[col]?.v;
            // ตรวจสอบว่า value เป็นตัวเลขและไม่ใช่ "-" หรือ "_"
            if (value && !isNaN(parseFloat(value)) && value !== '-' && value !== '_') {
                // แปลงค่าที่ได้เป็นชั่วโมง:นาที เช่น 100 -> "100:00"
                return convertToTimeFormat(value);
            }
        }
        return 'N/A'; // ถ้าไม่พบค่าที่เป็นตัวเลข
    }

    // ฟังก์ชันแปลงค่าที่ได้รับเป็นฟอร์แมต "xx:xx" โดยไม่คำนวณ
    function convertToTimeFormat(value) {
        // แปลงตัวเลขเป็นชั่วโมง:นาที
        let timeValue = value.toString();
        if (timeValue.includes(':')) {
            // ถ้ามีการใช้ ":", จะตัดแค่ส่วนที่เป็นชั่วโมงและนาที
            return timeValue.split(':').slice(0, 2).join(':');
        }
        return timeValue; // ถ้าไม่มี ":", แสดงค่าเดิม
    }
}



function formatHours(value) {
    if (!value) return "N/A";
    return value.replace(/:00$/, "");
}

function extractProvince(text) {
    for (let province in provinceCoordinates) {
        if (text.includes(province)) {
            return province;
        }
    }
    return "นครสวรรค์";
}

// ตัวแปรเก็บจำนวนเครื่องบินในแต่ละตำแหน่ง
const positionCounts = {};
// ตัวแปรเก็บข้อมูลการจัดเรียงเครื่องบินในแต่ละตำแหน่ง
const positionArrangements = {};

function addJitter([lat, lng]) {
    // สร้างคีย์สำหรับตำแหน่งนี้
    const posKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    // ถ้ายังไม่มีเครื่องบินในตำแหน่งนี้ ให้เริ่มนับที่ 0 และสร้างอาร์เรย์เก็บข้อมูลการจัดเรียง
    if (!positionCounts[posKey]) {
        positionCounts[posKey] = 0;
        positionArrangements[posKey] = [];
    }

    // เพิ่มจำนวนเครื่องบินในตำแหน่งนี้
    positionCounts[posKey]++;
    const count = positionCounts[posKey];

    // กำหนดระยะห่างระหว่างเครื่องบิน (ค่าคงที่ ไม่ขึ้นกับการซูม)
    const offset = 0.03; // ระยะห่างที่มากพอแม้จะซูมออก

    // คำนวณตำแหน่งใหม่แบบกระจายเป็นวงกลม
    let jitterLat = 0;
    let jitterLng = 0;

    if (count === 1) {
        // เครื่องบินแรกอยู่ตรงกลาง
        jitterLat = 0;
        jitterLng = 0;
    } else {
        // จัดเรียงเครื่องบินเป็นวงกลมรอบจุดศูนย์กลาง
        // คำนวณมุมสำหรับตำแหน่งบนวงกลม
        const angle = (count - 2) * (Math.PI / 4); // แบ่งเป็น 8 ส่วนรอบวงกลม

        // คำนวณรัศมีตามจำนวนเครื่องบิน (เพิ่มขึ้นเมื่อมีเครื่องบินมากขึ้น)
        const radius = offset * (1 + Math.floor((count - 2) / 8) * 0.5);

        // คำนวณตำแหน่งบนวงกลม
        jitterLat = radius * Math.sin(angle);
        jitterLng = radius * Math.cos(angle);
    }

    return [lat + jitterLat, lng + jitterLng];
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
    if (flight.type === 'helicopter') {
        // ใช้ฟังก์ชัน getValidACheck เพื่อคำนวณ maxHours สำหรับเฮลิคอปเตอร์
        let column = await HgetValidACheck(flight.aircraftNumber);  // ใช้ฟังก์ชันนี้เพื่อตรวจสอบค่าในคอลัมน์ H, I, J
        console.log("✅ maxHours from Google Sheets:", column);

        // ตรวจสอบค่าที่ได้จากคอลัมน์และกำหนด maxHours ตามลำดับ
        if (column === 7) {  // ถ้าเจอคอลัมน์ H (7)
            maxHours = 100;   // กำหนดให้ maxHours = 100
        } else if (column === 8) {  // ถ้าเจอคอลัมน์ I (8)
            maxHours = 150;   // กำหนดให้ maxHours = 150
        } else if (column === 9) {  // ถ้าเจอคอลัมน์ J (9)
            maxHours = 300;   // กำหนดให้ maxHours = 300
        }
    }

    console.log("✅ maxHours:", maxHours);
    const remainingAcheck = parseFloat(flight.aCheck) || 0;
    let aCheckPercentage = ((maxHours - remainingAcheck) / maxHours) * 100; // คำนวณเปอร์เซ็นต์

    // ถ้าเปอร์เซ็นต์ติดลบ ให้ตั้งเป็น 0%
    if (aCheckPercentage < 0) {
        aCheckPercentage = 0;
    }

    // ตรวจสอบไม่ให้เปอร์เซ็นต์เกิน 100
    if (aCheckPercentage > 100) {
        aCheckPercentage = 100;
    }

    // กำหนดสีของหลอดตามเปอร์เซ็นต์
    let barColor = 'var(--success-color)';  // สีเขียว (ดี)
    if (aCheckPercentage > 70) {
        barColor = 'var(--danger-color)';  // สีแดง (แย่)
    }

    // สถานะการใช้งาน
    const isAvailable = flight.status.toLowerCase() === "yes";
    const statusText = isAvailable ? "ใช้งานได้" : "ไม่สามารถใช้งาน";
    const statusClass = isAvailable ? "status-available" : "status-unavailable";
    const statusIcon = isAvailable ? "✅" : "❌";
    const statusColor = isAvailable ? "var(--success-color)" : "var(--danger-color)";

    sidebarContent.innerHTML = `
        <button class="close-btn" onclick="closeSidebar()">
            <i class="fas fa-times"></i>
        </button>

        <div class="sidebar-header">
            <h2 class="popup-title">${flight.name}</h2>
            <div class="aircraft-number">${flight.aircraftNumber}</div>
            <div class="status-badge" style="background-color: ${statusColor}">
                <i class="fas ${isAvailable ? 'fa-check-circle' : 'fa-times-circle'}"></i>
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
                    <span class="info-value">${flight.aCheck} / ${maxHours} ชม. (${aCheckPercentage.toFixed(1)}%)</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${aCheckPercentage}%; background-color: ${barColor};">
                        <span class="progress-text">${aCheckPercentage.toFixed(1)}%</span>
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
        map.removeLayer(marker);
    });

    // เคลียร์อาร์เรย์มาร์กเกอร์
    markers = [];

    // รีเซ็ตตัวนับตำแหน่งเพื่อจัดเรียงมาร์กเกอร์ใหม่
    // ล้างข้อมูลเก่าทั้งหมด
    for (let key in positionCounts) {
        delete positionCounts[key];
    }

    // สร้างมาร์กเกอร์ใหม่จากข้อมูลปัจจุบัน
    flightData.forEach(flight => {
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

        // แก้ไขปัญหาเฉพาะสำหรับเครื่องบินหมายเลข 1911
        if (flight.aircraftNumber === "1911") {
            // กำหนดตำแหน่งคงที่สำหรับเครื่องบินหมายเลข 1911
            // ใช้ตำแหน่งเดิมโดยไม่มีการเพิ่ม jitter
            flight.latitude = flight.latitude;
            flight.longitude = flight.longitude;
        }

        // ตั้งค่าสีของเงาตามสถานะ (ตรวจสอบว่า status มีค่าหรือไม่)
        const status = flight.status || "no";
        const shadowColor = (status.toString().toUpperCase() === "YES")
            ? "#34c759"  // สีเขียวสำหรับใช้งานได้ (ใช้ iOS green color)
            : "#ff3b30";  // สีแดงสำหรับใช้งานไม่ได้ (ใช้ iOS red color)

        // สร้างไอคอนแบบ divIcon
        // สร้างชื่อย่อของเครื่องบิน
        const shortName = flight.name.split('-')[0] || flight.name;

        const vehicleIcon = L.divIcon({
            className: 'custom-icon',  // ตั้งคลาส CSS เพื่อจัดการสไตล์
            html: `<div class="marker-container">
                    <div class="marker-status" style="background-color: ${shadowColor}"></div>
                    <img src="${iconUrl}" class="marker-image">
                    <div class="marker-label">${flight.aircraftNumber.split(' ').pop() || flight.aircraftNumber}</div>
                  </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 30],
            popupAnchor: [0, -30]
        });

        // สร้างมาร์กเกอร์
        const marker = L.marker([flight.latitude, flight.longitude], { icon: vehicleIcon })
            .addTo(map)
            .on('click', function () {
                try {
                    // ตรวจสอบว่ามีข้อมูลเครื่องบินหรือไม่
                    if (!flight) {
                        console.error("ไม่พบข้อมูลเครื่องบิน");
                        return;
                    }

                    console.log("กำลังอัปเดต sidebar จากมาร์กเกอร์สำหรับเครื่องบิน:", flight.name, flight.aircraftNumber);
                    window.updateSidebar(flight);
                } catch (error) {
                    console.error("เกิดข้อผิดพลาดในการอัปเดต sidebar จากมาร์กเกอร์:", error);
                    console.error("รายละเอียดข้อผิดพลาด:", error.message);
                    console.error("Stack trace:", error.stack);
                }
            });

        // เก็บข้อมูลมาร์กเกอร์
        markers.push({ flight, marker });
    });
}

// ฟังก์ชันบังคับโหลดข้อมูลใหม่
async function forceRefreshData() {
    try {
        // ลบข้อมูล cache เดิม
        localStorage.removeItem('flightDataCache');
        localStorage.removeItem('flightDataTimestamp');

        // โหลดข้อมูลใหม่
        await fetchFlightData();

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


