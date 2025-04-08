// ฟังก์ชันตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
function checkIsMobile() {
    return window.innerWidth <= 768;
}

// ฟังก์ชันแสดงค่าเวลาสำหรับเครื่องบิน SKA (ไม่แปลงเป็นรูปแบบเวลา แต่แสดงเป็นตัวเลขทศนิยม)
function formatSKATime(timeStr) {
    if (!timeStr) return "0";
    
    console.log("formatSKATime input:", timeStr);
    
    try {
        // ถ้าเป็นรูปแบบ XX:XX
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
            const parts = timeStr.split(':');
            if (parts.length === 2) {
                const hours = parseInt(parts[0], 10);
                const minutes = parseInt(parts[1], 10);
                
                if (!isNaN(hours) && !isNaN(minutes)) {
                    // แปลงนาทีเป็นทศนิยม (เช่น 30 นาที = 0.5)
                    const decimal = minutes / 60;
                    // ปัดทศนิยมให้เหลือ 1 ตำแหน่ง
                    const result = (hours + decimal).toFixed(1);
                    console.log(`Converted ${timeStr} to ${result}`);
                    return result;
                }
            }
        } else if (typeof timeStr === 'string' && timeStr.includes('.')) {
            // ถ้าเป็นรูปแบบ XX.XX อยู่แล้ว ให้ปัดทศนิยมให้เหลือ 1 ตำแหน่ง
            const numValue = parseFloat(timeStr);
            if (!isNaN(numValue)) {
                return numValue.toFixed(1);
            }
        } else if (!isNaN(parseFloat(timeStr))) {
            // ถ้าเป็นตัวเลข ให้ปัดทศนิยมให้เหลือ 1 ตำแหน่ง
            return parseFloat(timeStr).toFixed(1);
        }
        
        // ถ้าไม่ใช่รูปแบบที่รองรับ ให้คืนค่าเดิม
        return timeStr;
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการแปลงเวลา SKA:", error);
        return timeStr;
    }
}

// ฟังก์ชันแปลงเวลาให้อยู่ในรูปแบบ "ชั่วโมง:นาที" โดยไม่มีการปัดเศษ
function formatFlightHours(hours, isSKA = false) {
    if (hours === undefined || hours === null) return "0:00";

    try {
        console.log("formatFlightHours input:", hours, typeof hours, isSKA ? "(SKA)" : "");

        // ถ้าเป็นสตริงที่มีรูปแบบ "HH:MM" อยู่แล้ว
        if (typeof hours === 'string' && hours.includes(':')) {
            // ตรวจสอบว่ารูปแบบถูกต้องหรือไม่
            const parts = hours.split(':');
            if (parts.length === 2) {
                const h = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);

                if (!isNaN(h) && !isNaN(m)) {
                    // ถ้ารูปแบบถูกต้อง แต่ต้องตรวจสอบว่านาทีอยู่ในช่วง 0-59
                    if (m >= 0 && m < 60) {
                        console.log("Returning original HH:MM format:", hours);
                        return `${h}:${m.toString().padStart(2, '0')}`;
                    } else {
                        // ถ้านาทีไม่ถูกต้อง ให้ปรับค่า
                        const extraHours = Math.floor(m / 60);
                        const adjustedMinutes = m % 60;
                        console.log(`Adjusted ${hours} to ${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`);
                        return `${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`;
                    }
                }
            }
        }

        // ถ้าเป็นสตริงที่มีรูปแบบ "HH.MM" (ทศนิยม)
        if (typeof hours === 'string' && hours.includes('.')) {
            const parts = hours.split('.');
            if (parts.length === 2) {
                const h = parseInt(parts[0], 10);
                
                // สำหรับเครื่องบิน SKA ทศนิยม .5 หมายถึง 30 นาที (ครึ่งชั่วโมง)
                if (isSKA) {
                    // แปลงทศนิยมเป็นนาที (.5 = 30 นาที)
                    // เต็ม 10 (1.0) เท่ากับ 60 นาที
                    const decimalPart = parseFloat(`0.${parts[1]}`);
                    const m = Math.round(decimalPart * 60);
                    
                    if (!isNaN(h) && !isNaN(m)) {
                        // ตรวจสอบว่านาทีอยู่ในช่วง 0-59
                        if (m >= 0 && m < 60) {
                            console.log(`Converted SKA ${hours} to ${h}:${m.toString().padStart(2, '0')}`);
                            return `${h}:${m.toString().padStart(2, '0')}`;
                        } else {
                            // ถ้านาทีไม่ถูกต้อง ให้ปรับค่า
                            const extraHours = Math.floor(m / 60);
                            const adjustedMinutes = m % 60;
                            console.log(`Adjusted SKA ${hours} to ${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`);
                            return `${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`;
                        }
                    }
                } else {
                    // สำหรับเครื่องบินทั่วไป ทศนิยมเป็นเศษส่วนของชั่วโมง (เช่น .4 = 24 นาที)
                    const decimalPart = parseFloat(`0.${parts[1]}`);
                    // ใช้ Math.trunc เพื่อตัดเศษทิ้งทั้งหมด
                    const m = Math.trunc(decimalPart * 60);

                    if (!isNaN(h) && !isNaN(m)) {
                        // ตรวจสอบว่านาทีอยู่ในช่วง 0-59
                        if (m >= 0 && m < 60) {
                            console.log(`Converted ${hours} to ${h}:${m.toString().padStart(2, '0')}`);
                            return `${h}:${m.toString().padStart(2, '0')}`;
                        } else {
                            // ถ้านาทีไม่ถูกต้อง ให้ปรับค่า
                            const extraHours = Math.floor(m / 60);
                            const adjustedMinutes = m % 60;
                            console.log(`Adjusted ${hours} to ${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`);
                            return `${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`;
                        }
                    }
                }
            }
        }

        // แปลงเป็นตัวเลข
        const numHours = parseFloat(hours);
        if (isNaN(numHours)) return "0:00";

        // สำหรับเครื่องบิน SKA ทศนิยม .5 หมายถึง 30 นาที (ครึ่งชั่วโมง)
        if (isSKA) {
            // แยกส่วนชั่วโมงและทศนิยม
            const h = Math.floor(numHours);
            const decimal = numHours - h;
            
            // แปลงทศนิยมเป็นนาที (.5 = 30 นาที)
            // เต็ม 10 (1.0) เท่ากับ 60 นาที
            const m = Math.round(decimal * 60);
            
            console.log(`Calculated from SKA ${numHours}: hours=${h}, minutes=${m}`);
            
            // ตรวจสอบว่านาทีอยู่ในช่วง 0-59
            if (m >= 0 && m < 60) {
                return `${h}:${m.toString().padStart(2, '0')}`;
            } else {
                // ถ้านาทีไม่ถูกต้อง ให้ปรับค่า
                const extraHours = Math.floor(m / 60);
                const adjustedMinutes = m % 60;
                return `${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`;
            }
        } else {
            // สำหรับเครื่องบินทั่วไป ทศนิยมเป็นเศษส่วนของชั่วโมง
            // แยกส่วนชั่วโมงและนาที โดยไม่ปัดเศษ
            const h = Math.floor(numHours);
            // ใช้ Math.trunc เพื่อตัดเศษทิ้งทั้งหมด
            const m = Math.trunc((numHours - h) * 60);

            console.log(`Calculated from ${numHours}: hours=${h}, minutes=${m}`);

            // ตรวจสอบว่านาทีอยู่ในช่วง 0-59
            if (m >= 0 && m < 60) {
                return `${h}:${m.toString().padStart(2, '0')}`;
            } else {
                // ถ้านาทีไม่ถูกต้อง ให้ปรับค่า
                const extraHours = Math.floor(m / 60);
                const adjustedMinutes = m % 60;
                console.log(`Adjusted to ${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`);
                return `${h + extraHours}:${adjustedMinutes.toString().padStart(2, '0')}`;
            }
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการจัดรูปแบบเวลา:", error);
        return "0:00";
    }
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

// ฟังก์ชันสำหรับดึงข้อมูลจาก Google Sheets
async function HgetValidACheck(aircraftNumber) {
    if (!aircraftNumber) {
        console.warn("ไม่ได้ระบุหมายเลขเครื่องบิน");
        return 150; // ค่าเริ่มต้น
    }

    try {
        const sheetID = "1_M74Pe_4uul0fkcEea8AMxQIMcPznNZ9ttCqvbeQgBs";  // ID ของชีต
        const helicopterSheetGID = "1621250589";  // GID ของแผ่นที่ต้องการดึงข้อมูล
        const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&gid=${helicopterSheetGID}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();

        // ตรวจสอบว่าข้อมูลที่ได้รับมีรูปแบบที่ถูกต้องหรือไม่
        if (!text || text.length < 50) {
            console.warn("ข้อมูลที่ได้รับจาก Google Sheets ไม่ถูกต้อง");
            return 150; // ค่าเริ่มต้น
        }

        // แปลงข้อมูลเป็น JSON
        try {
            const json = JSON.parse(text.substring(47, text.length - 2));

            // ตรวจสอบว่า JSON มีโครงสร้างที่ถูกต้องหรือไม่
            if (!json || !json.table || !json.table.rows || !Array.isArray(json.table.rows)) {
                console.warn("โครงสร้าง JSON ไม่ถูกต้อง");
                return 150; // ค่าเริ่มต้น
            }

            // ลูปค้นหาข้อมูลที่ตรงกับหมายเลขเครื่องบิน
            for (let row of json.table.rows) {
                if (!row.c || !Array.isArray(row.c) || row.c.length < 10) {
                    continue; // ข้ามแถวที่ไม่มีข้อมูลครบถ้วน
                }

                const aircraft = row.c[2]?.v;  // สมมติว่าหมายเลขเครื่องบินอยู่ในคอลัมน์ที่ 3 (index 2)

                if (!aircraft) continue; // ข้ามแถวที่ไม่มีหมายเลขเครื่องบิน

                // เปรียบเทียบหมายเลขเครื่องบิน
                if (aircraft.toString().trim() === aircraftNumber.toString().trim()) {
                    // ค้นหาคอลัมน์ H, I, J เพื่อนำ maxHours มาใช้
                    for (let col = 7; col <= 9; col++) {
                        let value = row.c[col]?.v;
                        if (value && value !== '-' && value !== '_') {
                            console.log(`พบค่า maxHours ในคอลัมน์ ${col}: ${value}`);
                            return col;  // คืนค่าที่พบในคอลัมน์ที่มีข้อมูล
                        }
                    }

                    // ถ้าไม่พบค่าในคอลัมน์ H, I, J ให้คืนค่าเริ่มต้น
                    return 150;
                }
            }

            // ถ้าไม่พบข้อมูลที่ตรงกับหมายเลขเครื่องบิน
            console.log(`ไม่พบข้อมูลสำหรับเครื่องบินหมายเลข ${aircraftNumber}`);
            return 150;
        } catch (jsonError) {
            console.error("เกิดข้อผิดพลาดในการแปลงข้อมูลเป็น JSON:", jsonError);
            return 150; // ค่าเริ่มต้น
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets:", error);
        return 150; // ค่าเริ่มต้น
    }
}

// ฟังก์ชันอัปเดต sidebar ใหม่
window.updateSidebar = async function(flight) {
    try {
        if (!flight || typeof flight !== 'object') {
            console.error("ข้อมูลเครื่องบินไม่ถูกต้อง:", flight);
            return;
        }

        const sidebar = document.getElementById('sidebar');
        const sidebarContent = document.getElementById('sidebar-content');

        if (!sidebar || !sidebarContent) {
            console.error("ไม่พบ element sidebar หรือ sidebarContent");
            return;
        }

        // ตรวจสอบว่า flight.name มีค่าหรือไม่
        const aircraftName = flight.name ? String(flight.name).trim() : "";
        const aircraftKey = aircraftName.toUpperCase();

        // ตรวจสอบว่า aircraftImages มีอยู่หรือไม่
        let aircraftImage = "https://via.placeholder.com/320x180?text=No+Image";
        if (typeof window.aircraftImages === 'object' && window.aircraftImages) {
            aircraftImage = window.aircraftImages[aircraftKey] || aircraftImage;
        }

    let maxHours = 150;  // ค่าพื้นฐานสำหรับเครื่องบินทั่วไป

    // ตรวจสอบว่า flight.name มีค่าหรือไม่
    if (flight.name) {
        const aircraftNameUpper = String(flight.name).toUpperCase();

        if (aircraftNameUpper === "CARAVAN") {
            maxHours = 100;  // สำหรับ CARAVAN ใช้ 100 ชั่วโมง
        }
        if (aircraftNameUpper === "CN-235" || aircraftNameUpper === "SKA350") {
            maxHours = 200;  // สำหรับ CN-235 และ SKA350 ใช้ 200 ชั่วโมง
        }
    }

    // เช็คหากเป็นเฮลิคอปเตอร์และปรับ maxHours
    if (flight.type === 'helicopter') {
        try {
            // ใช้ฟังก์ชัน HgetValidACheck เพื่อคำนวณ maxHours สำหรับเฮลิคอปเตอร์
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
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการดึงข้อมูล maxHours สำหรับเฮลิคอปเตอร์:", error);
            // ใช้ค่าเริ่มต้นในกรณีที่เกิดข้อผิดพลาด
            maxHours = 150;
        }
    }

    console.log("✅ maxHours:", maxHours);

    // ดึงค่า aCheck และ remainingHours
    let aCheckValue = 0;

    // ตรวจสอบรูปแบบของ aCheck
    if (flight.aCheck) {
        console.log("Original aCheck value:", flight.aCheck, typeof flight.aCheck);

        // ตรวจสอบว่าเป็นเครื่องบิน SKA หรือไม่
        const isSKA = flight.name && (flight.name.toUpperCase().includes("SKA") || flight.name.toUpperCase().includes("SUPER KING AIR"));
        
        // สำหรับเครื่องบิน SKA ให้แปลงค่าเวลาจากรูปแบบ XX:XX เป็นทศนิยม
        if (isSKA && typeof flight.aCheck === 'string' && flight.aCheck.includes(':')) {
            const [hours, minutes] = flight.aCheck.split(':').map(Number);
            // แปลงนาทีเป็นทศนิยม (เช่น 30 นาที = 0.5)
            const decimal = minutes / 60;
            // ปัดทศนิยมให้เหลือ 1 ตำแหน่ง
            flight.rawACheck = (hours + decimal).toFixed(1);
            console.log(`Converted SKA ${flight.aCheck} to decimal: ${flight.rawACheck}`);
            aCheckValue = hours + decimal;
        }
        // ถ้าเป็นรูปแบบ "HH:MM" ให้แปลงเป็นทศนิยม
        else if (typeof flight.aCheck === 'string' && flight.aCheck.includes(':')) {
            const [hours, minutes] = flight.aCheck.split(':').map(Number);
            aCheckValue = hours + (minutes / 60);
            console.log(`Converted ${flight.aCheck} to decimal: ${aCheckValue}`);
        }
        // ถ้าเป็นรูปแบบ "HH.MM" (ทศนิยม)
        else if (typeof flight.aCheck === 'string' && flight.aCheck.includes('.')) {
            // เก็บค่าเดิมไว้ใช้แสดงผล
            aCheckValue = parseFloat(flight.aCheck) || 0;
            console.log(`Parsed decimal: ${aCheckValue}`);
        }
        else {
            // ถ้าเป็นตัวเลขหรือสตริงที่เป็นตัวเลข
            aCheckValue = parseFloat(flight.aCheck) || 0;
            console.log(`Parsed number: ${aCheckValue}`);
        }
    }

    // ดึงค่า remainingHours
    let remainingHoursValue = 0;

    if (flight.remainingHours) {
        console.log("Original remainingHours value:", flight.remainingHours, typeof flight.remainingHours);

        // ตรวจสอบว่าเป็นเครื่องบิน SKA หรือไม่
        const isSKA = flight.name && (flight.name.toUpperCase().includes("SKA-350") || flight.name.toUpperCase().includes("SUPER KING AIR"));
        
        // สำหรับเครื่องบิน SKA ให้แปลงค่าเวลาจากรูปแบบ XX:XX เป็นทศนิยม
        if (isSKA && typeof flight.remainingHours === 'string' && flight.remainingHours.includes(':')) {
            const [hours, minutes] = flight.remainingHours.split(':').map(Number);
            // แปลงนาทีเป็นทศนิยม (เช่น 30 นาที = 0.5)
            const decimal = minutes / 60;
            // ปัดทศนิยมให้เหลือ 1 ตำแหน่ง
            flight.rawFlightHours = (hours + decimal).toFixed(1);
            console.log(`Converted SKA ${flight.remainingHours} to decimal: ${flight.rawFlightHours}`);
            remainingHoursValue = hours + decimal;
        }
        // ถ้าเป็นรูปแบบ "HH:MM" ให้แปลงเป็นทศนิยม
        else if (typeof flight.remainingHours === 'string' && flight.remainingHours.includes(':')) {
            const [hours, minutes] = flight.remainingHours.split(':').map(Number);
            remainingHoursValue = hours + (minutes / 60);
            console.log(`Converted ${flight.remainingHours} to decimal: ${remainingHoursValue}`);
        } else {
            // ถ้าเป็นตัวเลขหรือสตริงที่เป็นตัวเลข
            remainingHoursValue = parseFloat(flight.remainingHours) || 0;
            console.log(`Parsed remainingHours: ${remainingHoursValue}`);
        }
    }

    // คำนวณชั่วโมงคงเหลือ (aCheck - remainingHours)
    let remainingHours = 0;
    
    // ตรวจสอบว่ามีค่า aCheckDue หรือไม่
    if (flight.aCheckDue) {
        console.log("Using aCheckDue value:", flight.aCheckDue);

        // ถ้าเป็นรูปแบบ "HH:MM" ให้แปลงเป็นทศนิยม
        if (typeof flight.aCheckDue === 'string' && flight.aCheckDue.includes(':')) {
            const [hours, minutes] = flight.aCheckDue.split(':').map(Number);
            remainingHours = hours + (minutes / 60);
            console.log(`Converted aCheckDue ${flight.aCheckDue} to decimal: ${remainingHours}`);
        } else {
            // ถ้าเป็นตัวเลขหรือสตริงที่เป็นตัวเลข
            remainingHours = parseFloat(flight.aCheckDue) || 0;
            console.log(`Parsed aCheckDue: ${remainingHours}`);
        }
    } 
    // ตรวจสอบว่ามีค่าชั่วโมงบินคงเหลือครบซ่อมตามประเภทเครื่องบิน
    else if (flight.type === 'helicopter' && flight["ชั่วโมงบินคงเหลือครบซ่อม 100"] && maxHours === 100) {
        const timeStr = flight["ชั่วโมงบินคงเหลือครบซ่อม 100"];
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            remainingHours = hours + (minutes / 60);
            console.log(`Using helicopter 100 hours: ${timeStr}, converted to: ${remainingHours}`);
        } else {
            remainingHours = parseFloat(timeStr) || 0;
        }
    }
    else if (flight.type === 'helicopter' && flight["ชั่วโมงบินคงเหลือครบซ่อม 150"] && maxHours === 150) {
        const timeStr = flight["ชั่วโมงบินคงเหลือครบซ่อม 150"];
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            remainingHours = hours + (minutes / 60);
            console.log(`Using helicopter 150 hours: ${timeStr}, converted to: ${remainingHours}`);
        } else {
            remainingHours = parseFloat(timeStr) || 0;
        }
    }
    else if (flight.type === 'helicopter' && flight["ชั่วโมงบินคงเหลือครบซ่อม 300"] && maxHours === 300) {
        const timeStr = flight["ชั่วโมงบินคงเหลือครบซ่อม 300"];
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            remainingHours = hours + (minutes / 60);
            console.log(`Using helicopter 300 hours: ${timeStr}, converted to: ${remainingHours}`);
        } else {
            remainingHours = parseFloat(timeStr) || 0;
        }
    }
    else {
        // ถ้าไม่มี ให้คำนวณจาก aCheck - remainingHours
        remainingHours = Math.max(0, aCheckValue - remainingHoursValue);
        console.log(`Calculated remainingHours: ${aCheckValue} - ${remainingHoursValue} = ${remainingHours}`);
    }

    console.log("✅ ข้อมูลการคำนวณ:", {
        aCheck: aCheckValue,
        remainingHours: remainingHoursValue,
        คงเหลือ: remainingHours
    });

    // คำนวณเปอร์เซ็นต์ความคืบหน้า (แก้ไขการคำนวณ)
    let aCheckPercentage = (remainingHours / maxHours) * 100;

    // ตรวจสอบว่า aCheckPercentage เป็นตัวเลขที่ถูกต้องหรือไม่
    if (isNaN(aCheckPercentage) || !isFinite(aCheckPercentage)) {
        aCheckPercentage = 0;
    }

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
    const isAvailable = flight.status && String(flight.status).toLowerCase() === "yes";
    const statusText = isAvailable ? "ใช้งานได้" : "ไม่สามารถใช้งาน";
    const statusIcon = isAvailable ? "✅" : "❌";
    const statusColor = isAvailable ? "var(--success-color)" : "var(--danger-color)";

    try {
        // สร้าง HTML สำหรับ sidebar
        const aircraftName = flight.name || "ไม่ระบุ";
        const aircraftNumber = flight.aircraftNumber || "ไม่ระบุ";
        const missionBase = flight.missionBase || "ไม่ระบุ";

        // ใช้ค่า remainingHours ที่คำนวณแล้ว แปลงเป็นรูปแบบ "ชั่วโมง:นาที"
        const remainingHoursDisplay = flight.remainingHours || remainingHoursValue || "0";
        
        // ตรวจสอบว่าเป็นเครื่องบิน SKA หรือไม่
        const isSKA = flight.name && (flight.name.toUpperCase().includes("SKA") || flight.name.toUpperCase().includes("SUPER KING AIR"));
        
        // แสดงค่าดิบที่ได้รับมาเพื่อตรวจสอบ
        console.log(`ข้อมูลเครื่องบินหมายเลข ${aircraftNumber} ในไซด์บาร์:`, {
            "ประเภท": isSKA ? "SKA (XX.X)" : "ทั่วไป",
            "ชั่วโมงเครื่องบิน (ที่แสดง)": remainingHoursDisplay,
            "ชั่วโมงเครื่องบิน (ดิบ)": flight.rawFlightHours || flight.remainingHours,
            "A CHECK (ดิบ)": flight.rawACheck || flight.aCheck
        });

        // ใช้ค่าดิบจาก flight.engineLH และ flight.engineRH ถ้ามี
        const engineLH = flight.engineLH || "0";
        const engineRH = flight.engineRH || "0";

        const maintenanceManager = flight.maintenanceManager || "ไม่ระบุ";
        const note = flight.note || "";

        sidebarContent.innerHTML = `
            <button class="close-btn" onclick="closeSidebar()">
                <i class="fas fa-times"></i>
            </button>

            <div class="image-container">
                <img src="${aircraftImage}" alt="${aircraftName}" class="airplane-image">
                <div class="image-overlay"></div>
                <div class="aircraft-title">
                    <h2>${aircraftName}</h2>
                    <span>${aircraftNumber}</span>
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
                    <span class="chart-value">ครบซ่อม ${isSKA ? (flight.rawACheck || aCheckValue) : formatFlightHours(aCheckValue)} / ${maxHours} ชม. (${aCheckPercentage.toFixed(1)}%)</span>
                </div>
                <div class="chart-container">
                    <div class="donut-chart" style="--percentage: ${displayPercentage}; --color: ${barColor};">
                        <div class="chart-center">
                            <span>${isSKA ? (flight.rawFlightHours || remainingHours) : formatFlightHours(remainingHours)}</span>
                            <small>ชม.</small>
                        </div>
                    </div>
                    <div class="chart-info">
                        <div class="chart-detail">
                            <span class="detail-label">100 ชม.</span>
                            <span class="detail-value">${flight["ชั่วโมงบินคงเหลือครบซ่อม 100"] ? (isSKA ? flight["ชั่วโมงบินคงเหลือครบซ่อม 100"] : formatFlightHours(flight["ชั่วโมงบินคงเหลือครบซ่อม 100"])) : '_'}</span>
                        </div>
                        <div class="chart-detail">
                            <span class="detail-label">150 ชม.</span>
                            <span class="detail-value">${flight["ชั่วโมงบินคงเหลือครบซ่อม 150"] ? (isSKA ? flight["ชั่วโมงบินคงเหลือครบซ่อม 150"] : formatFlightHours(flight["ชั่วโมงบินคงเหลือครบซ่อม 150"])) : '_'}</span>
                        </div>
                        <div class="chart-detail">
                            <span class="detail-label">300 ชม.</span>
                            <span class="detail-value">${flight["ชั่วโมงบินคงเหลือครบซ่อม 300"] ? (isSKA ? flight["ชั่วโมงบินคงเหลือครบซ่อม 300"] : formatFlightHours(flight["ชั่วโมงบินคงเหลือครบซ่อม 300"])) : '_'}</span>
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
                        <span class="info-value">${isSKA ? (flight.rawFlightHours || remainingHoursDisplay) : (flight.rawFlightHours || (typeof remainingHoursDisplay === 'string' && remainingHoursDisplay.includes(':') ? remainingHoursDisplay : formatFlightHours(remainingHoursDisplay)))}</span>
                    </div>
                </div>

                <div class="info-card">
                    <div class="info-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="info-content">
                        <span class="info-label">ฐานที่ตั้ง</span>
                        <span class="info-value">${missionBase}</span>
                    </div>
                </div>
            </div>

            ${flight.type === 'helicopter' ? `
            <div class="engine-section">
                <h3><i class="fas fa-helicopter"></i> ชั่วโมงบินเฮลิคอปเตอร์</h3>
                <div class="flight-hours">
                    <div class="info-card-content">
                        <div class="info-value">${typeof remainingHoursDisplay === 'string' && remainingHoursDisplay.includes(':') ? remainingHoursDisplay : formatFlightHours(remainingHoursDisplay)}</div>
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
                        <div class="engine-hours">${isSKA ? engineLH : (typeof engineLH === 'string' && engineLH.includes(':') ? engineLH : formatFlightHours(engineLH))} <small>ชม.</small></div>
                    </div>
                    <div class="engine-card">
                        <div class="engine-title">No.2 / RH</div>
                        <div class="engine-hours">${isSKA ? engineRH : (typeof engineRH === 'string' && engineRH.includes(':') ? engineRH : formatFlightHours(engineRH))} <small>ชม.</small></div>
                    </div>
                </div>
            </div>
            `}

            <div class="maintenance-section">
                <h3><i class="fas fa-user-cog"></i> ผู้ควบคุมงานช่าง</h3>
                <div class="maintenance-manager">${maintenanceManager}</div>
            </div>

            ${note ? `
            <div class="note-section">
                <h3><i class="fas fa-sticky-note"></i> หมายเหตุ</h3>
                <div class="note-content">${note}</div>
            </div>
            ` : ""}
        `;
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการสร้าง HTML สำหรับ sidebar:", error);
        sidebarContent.innerHTML = `
            <button class="close-btn" onclick="closeSidebar()">
                <i class="fas fa-times"></i>
            </button>
            <div class="error-message">
                <h3>เกิดข้อผิดพลาด</h3>
                <p>ไม่สามารถแสดงข้อมูลเครื่องบินได้</p>
            </div>
        `;
    }

    // แสดง sidebar ด้วย animation
    try {
        sidebar.style.display = 'block';
        setTimeout(() => {
            try {
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
                                try {
                                    map.invalidateSize();
                                } catch (mapError) {
                                    console.warn("ไม่สามารถปรับขนาดแผนที่ได้:", mapError);
                                }
                            }, 300);
                        }
                    }
                }

                // เพิ่ม animation ให้กับองค์ประกอบภายใน sidebar
                try {
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
                } catch (animationError) {
                    console.warn("ไม่สามารถเพิ่ม animation ให้กับองค์ประกอบภายใน sidebar ได้:", animationError);
                }
            } catch (sidebarError) {
                console.error("เกิดข้อผิดพลาดในการแสดง sidebar:", sidebarError);
            }
        }, 10);
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการแสดง sidebar:", error);
    }
    } catch (mainError) {
        console.error("เกิดข้อผิดพลาดหลักในฟังก์ชัน updateSidebar:", mainError);
    }
}

// ฟังก์ชันปิด sidebar
window.closeSidebar = function() {
    try {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.warn("ไม่พบ element sidebar");
            return;
        }

        // ซ่อน sidebar ด้วย animation
        sidebar.classList.remove('active');

        // คืนค่าความสูงของแผนที่กลับเป็น 100% เมื่อปิด sidebar
        try {
            if (typeof checkIsMobile === 'function' && checkIsMobile()) {
                // ใช้ฟังก์ชัน resetMapSize ถ้ามี
                if (typeof window.resetMapSize === 'function') {
                    setTimeout(window.resetMapSize, 50);
                } else {
                    // ถ้าไม่มีฟังก์ชัน resetMapSize ให้ตั้งค่าสไตล์โดยตรง
                    const mapElement = document.getElementById('map');
                    if (mapElement) {
                        setTimeout(() => {
                            try {
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
                            } catch (mapError) {
                                console.warn("ไม่สามารถปรับขนาดแผนที่ได้:", mapError);
                            }
                        }, 50);
                    }
                }
            }
        } catch (mobileError) {
            console.warn("เกิดข้อผิดพลาดในการตรวจสอบอุปกรณ์มือถือ:", mobileError);
        }

        // รอให้ animation เสร็จสิ้นก่อนซ่อน element
        setTimeout(() => {
            try {
                sidebar.style.display = 'none';
            } catch (displayError) {
                console.warn("ไม่สามารถซ่อน sidebar ได้:", displayError);
            }
        }, 400);
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในฟังก์ชัน closeSidebar:", error);
    }
}