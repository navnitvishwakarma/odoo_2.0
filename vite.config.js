import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                // Admin Pages
                adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
                adminEmployees: resolve(__dirname, 'admin/employees.html'),
                adminAttendance: resolve(__dirname, 'admin/attendance.html'),
                adminTimeoff: resolve(__dirname, 'admin/timeoff.html'),
                adminPayroll: resolve(__dirname, 'admin/payroll.html'),
                // Employee Pages
                employeeDashboard: resolve(__dirname, 'employee/dashboard.html'),
                employeeProfile: resolve(__dirname, 'employee/profile.html'),
                employeeAttendance: resolve(__dirname, 'employee/attendance.html'),
                employeeTimeoff: resolve(__dirname, 'employee/timeoff.html'),
                employeePayroll: resolve(__dirname, 'employee/payroll.html')
            }
        }
    }
});
