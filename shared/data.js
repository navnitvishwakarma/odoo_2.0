const API_URL = '/api';

export let data = {
    employees: [],
    attendance: [],
    timeoff: [],
    payroll: [],
    officeLocation: null
};

// --- Sync Function ---
export async function initData() {
    try {
        const res = await fetch(`${API_URL}/init`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch data');
        const json = await res.json();
        data.employees = json.employees || [];
        data.attendance = json.attendance || [];
        data.timeoff = json.timeoff || [];
        data.payroll = json.payroll || [];
        data.officeLocation = json.officeLocation || null;
        console.log("Data Synced from Atlas:", data);
    } catch (err) {
        console.error("Init Data Error:", err);
        alert("Failed to connect to server. Ensure node server.js is running.");
    }
}

// Stub for commit (not needed with API, but keeping for compatibility if utilized elsewhere safely)
export function commit() {
    // No-op 
}

// --- Mutators (Async now) ---

export async function updateEmployeeStatus(empId, newStatus) {
    const emp = data.employees.find(e => e.employeeId === empId);
    if (emp) {
        emp.status = newStatus;
        // Optimistic update
        await fetch(`${API_URL}/employees/${emp.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
    }
}

export async function addAttendance(record) {
    record.id = Date.now();
    // Optimistic
    data.attendance.unshift(record);

    await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
    });
}

export async function addTimeOffRequest(request) {
    request.id = Date.now();
    request.status = request.status || 'Pending';
    request.rejectionCategory = "";
    request.rejectionReason = "";

    if (!request.employeeName && request.employeeId) {
        const emp = data.employees.find(e => e.id === request.employeeId);
        if (emp) request.employeeName = emp.name;
    }
    if (request.type && !request.leaveType) request.leaveType = request.type;
    if (!request.type && request.leaveType) request.type = request.leaveType;

    data.timeoff.push(request);

    await fetch(`${API_URL}/timeoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
    });
}

export async function updateTimeOffStatus(requestId, newStatus, rejectionCategory = "", rejectionReason = "") {
    const req = data.timeoff.find(r => r.id === requestId);
    if (req) {
        req.status = newStatus;
        if (newStatus === 'Rejected') {
            req.rejectionCategory = rejectionCategory;
            req.rejectionReason = rejectionReason;
        } else {
            req.rejectionCategory = "";
            req.rejectionReason = "";
        }

        await fetch(`${API_URL}/timeoff/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req)
        });
    }
}

export function resetData() {
    // Not applicable for Server DB easily, maybe specific endpoint
    alert("Reset not supported in Cloud Mode");
}

export async function generatePayroll(month, year) {
    // Generate for all employees if not exists
    for (const emp of data.employees) {
        const exists = data.payroll.find(p => p.employeeId === emp.id && p.month === month && p.year === year);
        if (exists) continue;

        const basic = 5000;
        const hra = 2000;
        const da = 1000;
        const deductions = 500;
        const net = basic + hra + da - deductions;

        const slip = {
            id: Date.now() + Math.random(),
            employeeId: emp.employeeId,
            employeeName: emp.name,
            month,
            year,
            basic,
            hra,
            da,
            deductions,
            net,
            generatedDate: new Date().toISOString()
        };

        data.payroll.push(slip);

        await fetch(`${API_URL}/payroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slip)
        });
    }
}

export async function addEmployee(empData) {
    const res = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...empData, password: '123456' }) // Ensure default password on creation
    });
    if (!res.ok) throw new Error('Failed to add employee');
    const newEmp = await res.json();
    data.employees.push(newEmp); // Optimistic update
    return newEmp;
}

export async function changePassword(employeeId, oldPassword, newPassword) {
    const res = await fetch(`${API_URL}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, oldPassword, newPassword })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to change password');
    }
    return await res.json();
}

export async function updateEmployee(id, updateData) {
    const res = await fetch(`${API_URL}/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update profile');
    }
    return await res.json();
}

export async function setOfficeLocation(lat, lng) {
    const loc = { lat, lng, setAt: new Date().toISOString() };
    data.officeLocation = loc;

    await fetch(`${API_URL}/office`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loc)
    });
}

export function getOfficeLocation() {
    return data.officeLocation;
}

export function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d * 1000;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
