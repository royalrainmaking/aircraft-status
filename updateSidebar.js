// ฟังก์ชันตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
function checkIsMobile() {
    return window.innerWidth <= 768;
}

// ฟังก์ชันรีเซ็ตขนาดของแผนที่ให้เป็นเต็มจอ
window.resetMapSize = function() {
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

// ฟังก์ชันอัปเดต sidebar ใหม่
window.updateSidebar = async function(flight) {
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

    // ดึงค่า aCheck และ remainingHours
    const aCheckValue = parseFloat(flight.aCheck) || 0;
    const remainingHoursValue = parseFloat(flight.remainingHours) || 0;

    // คำนวณชั่วโมงคงเหลือ (aCheck - remainingHours)
    let remainingHours = 0;
    if (flight.aCheckDue) {
        // ถ้ามีค่า aCheckDue ให้ใช้ค่านี้เลย
        remainingHours = parseFloat(flight.aCheckDue) || 0;
    } else {
        // ถ้าไม่มี ให้คำนวณจาก aCheck - remainingHours
        remainingHours = Math.max(0, aCheckValue - remainingHoursValue);
    }

    console.log("✅ ข้อมูลการคำนวณ:", {
        aCheck: aCheckValue,
        remainingHours: remainingHoursValue,
        คงเหลือ: remainingHours
    });

    // คำนวณเปอร์เซ็นต์ความคืบหน้า (แก้ไขการคำนวณ)
    let aCheckPercentage = (remainingHours / maxHours) * 100;

    // เปอร์เซ็นต์ที่แสดงในหน้าเว็บ (100 - aCheckPercentage)
    let displayPercentage = 100 - aCheckPercentage;

    // ถ้าเปอร์เซ็นต์ติดลบ ให้ตั้งเป็น 0%
    if (displayPercentage < 0) {
        displayPercentage = 0;
    }

    // ตรวจสอบไม่ให้เปอร์เซ็นต์เกิน 100
    if (displayPercentage > 100) {
        displayPercentage = 100;
    }

    console.log("✅ การคำนวณเปอร์เซ็นต์:", {
        maxHours: maxHours,
        remainingHours: remainingHours,
        aCheckPercentage: aCheckPercentage,
        displayPercentage: displayPercentage
    });

    // กำหนดสีของหลอดตามเปอร์เซ็นต์
    let barColor = 'var(--success-color)';  // สีเขียว (ดี)
    if (aCheckPercentage < 30) {
        barColor = 'var(--danger-color)';  // สีแดง (แย่)
    }

    // สถานะการใช้งาน
    const isAvailable = flight.status.toLowerCase() === "yes";
    const statusText = isAvailable ? "ใช้งานได้" : "ไม่สามารถใช้งาน";
    const statusIcon = isAvailable ? "✅" : "❌";
    const statusColor = isAvailable ? "var(--success-color)" : "var(--danger-color)";

    sidebarContent.innerHTML = `
        <button class="close-btn" onclick="closeSidebar()">
            <i class="fas fa-times"></i>
        </button>

        <div class="image-container">
            <img src="${aircraftImage}" alt="${flight.name}" class="airplane-image">
            <div class="image-overlay"></div>
            <div class="aircraft-title">
                <h2>${flight.name}</h2>
                <span>${flight.aircraftNumber}</span>
            </div>
        </div>

        <div class="status-container">
            <div class="status-badge ${isAvailable ? 'available' : 'unavailable'}">
                <i class="fas ${isAvailable ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                ${statusText}
            </div>
        </div>

        <div class="maintenance-chart">
            <div class="chart-header">
                <h3>สถานะการซ่อมบำรุง</h3>
                <span class="chart-value">ครบซ่อม${aCheckValue} / ${maxHours} ชม. (${aCheckPercentage.toFixed(1)}%)</span>
            </div>
            <div class="chart-container">
                <div class="donut-chart" style="--percentage: ${displayPercentage}; --color: ${barColor};">
                    <div class="chart-center">
                        <span>${remainingHours.toFixed(1)}</span>
                        <small>ชม.</small>
                    </div>
                </div>
                <div class="chart-info">
                    <div class="chart-detail">
                        <span class="detail-label">ครบซ่อม:</span>
                        <span class="detail-value">${maxHours} ชม.</span>
                    </div>
                    <div class="chart-detail">
                        <span class="detail-label">คงเหลือ:</span>
                        <span class="detail-value">${remainingHours.toFixed(1)} ชม.</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-card">
                <div class="info-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="info-content">
                    <span class="info-label">ชั่วโมงบิน</span>
                    <span class="info-value">${flight.remainingHours}</span>
                </div>
            </div>

            <div class="info-card">
                <div class="info-icon">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <div class="info-content">
                    <span class="info-label">ฐานที่ตั้ง</span>
                    <span class="info-value">${flight.missionBase}</span>
                </div>
            </div>
        </div>

        ${flight.type === 'helicopter' ? `
        <div class="engine-section">
            <h3><i class="fas fa-helicopter"></i> ชั่วโมงบินเฮลิคอปเตอร์</h3>
            <div class="flight-hours">
                <div class="info-card-content">
                    <div class="info-value">${flight.remainingHours}</div>
                    <div class="info-label">ชั่วโมงบินทั้งหมด</div>
                </div>
            </div>
        </div>
        ` : `
        <div class="engine-section">
            <h3><i class="fas fa-cogs"></i> เครื่องยนต์</h3>
            <div class="engine-grid">
                <div class="engine-card">
                    <div class="engine-title">No.1 / LH</div>
                    <div class="engine-hours">${flight.engineLH} <small>ชม.</small></div>
                </div>
                <div class="engine-card">
                    <div class="engine-title">No.2 / RH</div>
                    <div class="engine-hours">${flight.engineRH} <small>ชม.</small></div>
                </div>
            </div>
        </div>
        `}

        <div class="maintenance-section">
            <h3><i class="fas fa-user-cog"></i> ผู้ควบคุมงานช่าง</h3>
            <div class="maintenance-manager">${flight.maintenanceManager || "ไม่ระบุ"}</div>
        </div>

        ${flight.note ? `
        <div class="note-section">
            <h3><i class="fas fa-sticky-note"></i> หมายเหตุ</h3>
            <div class="note-content">${flight.note}</div>
        </div>
        ` : ""}
    `;

    // แสดง sidebar ด้วย animation
    sidebar.style.display = 'block';
    setTimeout(() => {
        sidebar.classList.add('active');

        // ปรับขนาดแผนที่ในโหมดมือถือ
        if (typeof checkIsMobile === 'function' && checkIsMobile()) {
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
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            element.style.transitionDelay = `${0.1 + index * 0.05}s`;

            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, 10);
        });
    }, 10);
}

// ฟังก์ชันปิด sidebar
window.closeSidebar = function() {
    const sidebar = document.getElementById('sidebar');

    // ซ่อน sidebar ด้วย animation
    sidebar.classList.remove('active');

    // คืนค่าความสูงของแผนที่กลับเป็น 100% เมื่อปิด sidebar
    if (typeof checkIsMobile === 'function' && checkIsMobile()) {
        // ใช้ฟังก์ชัน resetMapSize ถ้ามี
        if (typeof window.resetMapSize === 'function') {
            setTimeout(window.resetMapSize, 50);
        } else {
            // ถ้าไม่มีฟังก์ชัน resetMapSize ให้ตั้งค่าสไตล์โดยตรง
            const mapElement = document.getElementById('map');
            if (mapElement) {
                setTimeout(() => {
                    mapElement.style.cssText = `
                        height: 100vh !important;
                        position: absolute !important;
                        top: 0 !important;
                        bottom: auto !important;
                        z-index: 1 !important;
                        width: 100% !important;
                    `;

                    // บังคับให้แผนที่คำนวณขนาดใหม่
                    if (typeof map !== 'undefined' && map) {
                        map.invalidateSize();
                    }
                }, 50);
            }
        }
    }

    // รอให้ animation เสร็จสิ้นก่อนซ่อน element
    setTimeout(() => {
        sidebar.style.display = 'none';
    }, 400);
}