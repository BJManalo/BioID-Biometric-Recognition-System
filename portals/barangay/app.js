document.addEventListener('DOMContentLoaded', async () => {
    // 1. SUPABASE INITIALIZATION
    const supabaseUrl = 'https://tzsglayusbbaajvsohtn.supabase.co';
    const supabaseKey = 'sb_publishable_fKtzX1kqT-2Qfi2j_aQoUQ_8dZFCmIa';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 2. CHECK SESSION
    const activeUserData = JSON.parse(sessionStorage.getItem('activeUserData'));
    if (!activeUserData || activeUserData.role !== 'BARANGAY') {
        window.location.href = '../../index.html';
        return;
    }

    const API_URL = `${window.location.origin}/api`;

    // Terminal Logging Helper
    async function logToTerminal(message, level = 'INFO') {
        try {
            await fetch(`${API_URL}/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, level })
            });
        } catch (e) {
            console.error('Logger failed', e);
        }
    }

    // Set Representative Info and Location Labels
    const repName = `${activeUserData.first_name} ${activeUserData.last_name}`;
    const muniName = activeUserData.municipality;
    const brgyName = activeUserData.barangay;

    // Update Profile UI
    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl) profileNameEl.textContent = `${brgyName} Representative`;

    const profileImgEl = document.getElementById('profileImg');
    if (profileImgEl) {
        profileImgEl.src = `https://ui-avatars.com/api/?name=${activeUserData.first_name}+${activeUserData.last_name}&background=103155&color=fff`;
    }

    // Update Barangay/Municipality Labels
    const muniBrgyLabel = document.getElementById('muniBrgyLabel');
    if (muniBrgyLabel) muniBrgyLabel.textContent = `${brgyName}, ${muniName}`;

    const brgyNameMuniLabel = document.getElementById('brgyNameMuniLabel');
    if (brgyNameMuniLabel) brgyNameMuniLabel.textContent = `${brgyName}, ${muniName}`;

    const brgyAccidentTitleBrgy = document.getElementById('brgyAccidentTitleBrgy');
    if (brgyAccidentTitleBrgy) brgyAccidentTitleBrgy.textContent = `${brgyName}, ${muniName}`;

    // Fill Read-Only Inputs in Resident Registration Form
    const resMuniInput = document.getElementById('resMunicipality');
    const resBrgyInput = document.getElementById('resBarangay');
    if (resMuniInput) resMuniInput.value = muniName;
    if (resBrgyInput) resBrgyInput.value = brgyName;

    // Sidebar Toggling
    const sidebar = document.querySelector(".sidebar");
    const sidebarBtn = document.querySelector(".sidebarBtn");
    if (sidebarBtn) {
        sidebarBtn.onclick = function () {
            if (sidebar) sidebar.classList.toggle("active");
            if (sidebar && sidebar.classList.contains("active")) {
                sidebarBtn.classList.replace("bx-menu", "bx-menu-alt-right");
            } else {
                sidebarBtn.classList.replace("bx-menu-alt-right", "bx-menu");
            }
        }
    }

    // Close sidebar on mobile clicking outside
    document.addEventListener("click", function(event) {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains("active")) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnSidebarBtn = sidebarBtn && sidebarBtn.contains(event.target);

            if (!isClickInsideSidebar && !isClickOnSidebarBtn) {
                sidebar.classList.remove("active");
                if (sidebarBtn) sidebarBtn.classList.replace("bx-menu-alt-right", "bx-menu");
            }
        }
    });

    // Tab Switching Logic
    const navLinks = document.querySelectorAll('.nav-links li a');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const tabName = link.getAttribute('data-tab');
            if (!tabName) return;

            e.preventDefault();
            const targetTabId = tabName + 'Tab';
            const targetTab = document.getElementById(targetTabId);

            if (targetTab) {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                tabContents.forEach(tab => tab.classList.remove('active'));
                targetTab.classList.add('active');

                document.querySelector('.dashboard').textContent = link.querySelector('.links_name').textContent;

                if (window.innerWidth <= 768) {
                    sidebar.classList.remove("active");
                    sidebarBtn.classList.replace("bx-menu-alt-right", "bx-menu");
                }
            }
        });
    });

    // Profile menu toggle / profile actions settings
    const sidebarSettingsBtn = document.getElementById('sidebarSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsForm = document.getElementById('settingsForm');

    if (sidebarSettingsBtn) {
        sidebarSettingsBtn.onclick = (e) => {
            e.preventDefault();
            if (settingsModal) settingsModal.style.display = 'flex';
        };
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.onclick = () => {
            if (settingsModal) settingsModal.style.display = 'none';
        };
    }

    // Pre-fill Settings Form
    if (activeUserData) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        setVal('settingsUsername', activeUserData.username || '');
        setVal('settingsFirstName', activeUserData.first_name || '');
        setVal('settingsLastName', activeUserData.last_name || '');
        setVal('settingsContact', activeUserData.contact_number || '');
        setVal('settingsPassword', activeUserData.temp_password || '');
    }

    // Password Toggle
    document.querySelectorAll('.toggle-settings-password').forEach(icon => {
        icon.onclick = () => {
            const fieldId = icon.getAttribute('data-target');
            const field = document.getElementById(fieldId);
            if (field) {
                if (field.type === 'password') {
                    field.type = 'text';
                    icon.classList.replace('bx-show', 'bx-hide');
                } else {
                    field.type = 'password';
                    icon.classList.replace('bx-hide', 'bx-show');
                }
            }
        };
    });

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updateData = {
                first_name: document.getElementById('settingsFirstName').value.trim(),
                last_name: document.getElementById('settingsLastName').value.trim(),
                contact_number: document.getElementById('settingsContact').value.trim(),
                temp_password: document.getElementById('settingsPassword').value.trim()
            };

            try {
                const { data, error } = await supabase
                    .from('barangays')
                    .update(updateData)
                    .eq('id', activeUserData.id)
                    .select();

                if (error) throw new Error(error.message || "Update failed");

                const updatedUser = { ...activeUserData, ...updateData };
                sessionStorage.setItem('activeUserData', JSON.stringify(updatedUser));
                
                showCustomAlert("Settings updated! Reloading...", "success", "Update Success");
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                console.error(err);
                showCustomAlert(err.message || "Update failed.", "error", "Error");
            }
        });
    }

    // 3. RESIDENTS DIRECTORY (Barangay Scoped)
    const residentsTableBody = document.getElementById('residentsTableBody');
    const recentResidentsTableBody = document.getElementById('recentResidentsTableBody');
    const openAddResidentBtn = document.getElementById('openAddResidentBtn');
    const dashboardRegisterBtn = document.getElementById('dashboardRegisterBtn');
    const closeResidentBtn = document.getElementById('closeResidentBtn');
    const cancelResidentBtn = document.getElementById('cancelResidentBtn');
    const residentModal = document.getElementById('residentModal');
    const residentForm = document.getElementById('residentForm');

    const openResidentModal = () => {
        residentForm.reset();
        
        // Re-ensure read-only jurisdiction fields are populated
        if (resMuniInput) resMuniInput.value = muniName;
        if (resBrgyInput) resBrgyInput.value = brgyName;

        // Reset Biometrics UI
        const section = document.getElementById('biometricSection');
        const initialState = document.getElementById('resScannerInitialState');
        const verifiedState = document.getElementById('resVerifiedState');
        if (section) {
            section.style.background = '#F0F9FF';
            section.style.borderColor = '#BAE6FD';
        }
        if (initialState) initialState.style.display = 'block';
        if (verifiedState) verifiedState.style.display = 'none';

        const thumb1Status = document.getElementById('thumb1Status');
        const thumb2Status = document.getElementById('thumb2Status');
        const instruction = document.getElementById('resScannerInstruction');
        const registerBtn = document.getElementById('registerFingerprintBtn');

        if (thumb1Status) {
            thumb1Status.innerHTML = "<i class='bx bx-time'></i> Left Thumb Pending";
            thumb1Status.style.background = "#E0F2FE";
            thumb1Status.style.color = "#0284C7";
        }
        if (thumb2Status) {
            thumb2Status.innerHTML = "<i class='bx bx-time'></i> Right Thumb Pending";
            thumb2Status.style.background = "#E0F2FE";
            thumb2Status.style.color = "#0284C7";
        }
        if (instruction) {
            instruction.innerHTML = "<i class='bx bx-info-circle'></i> To register, please place the resident's LEFT THUMB on the scanner.";
        }
        if (registerBtn) {
            registerBtn.innerHTML = "<i class='bx bx-fingerprint'></i> Capture Left Thumb";
            registerBtn.style.background = "#0369A1";
        }

        const resFingerprintId = document.getElementById('resFingerprintId');
        if (resFingerprintId) resFingerprintId.value = '';

        residentModal.classList.add('show');
    };

    if (openAddResidentBtn) openAddResidentBtn.onclick = openResidentModal;
    if (dashboardRegisterBtn) dashboardRegisterBtn.onclick = openResidentModal;
    if (closeResidentBtn) closeResidentBtn.onclick = () => residentModal.classList.remove('show');
    if (cancelResidentBtn) cancelResidentBtn.onclick = () => residentModal.classList.remove('show');

    // Fetch and load accident reports scoped to this Barangay or its resident victims
    const loadAccidentReports = async (residents = []) => {
        const fullReportsTableBody = document.getElementById('fullReportsTableBody');
        if (!fullReportsTableBody) return;

        try {
            const { data: reports, error } = await supabase
                .from('accident_reports')
                .select('*')
                .eq('municipality', muniName)
                .order('datetime', { ascending: false });

            if (error) throw error;

            const residentNames = new Set(
                residents.map(r => `${r.first_name} ${r.last_name}`.toLowerCase().trim())
            );

            const filteredReports = reports.filter(r => {
                if (r.location && r.location.toLowerCase() === brgyName.toLowerCase()) {
                    return true;
                }
                if (r.involved_biometrics) {
                    const match = r.involved_biometrics.match(/Name:\s*([^\n]+)/);
                    if (match) {
                        const victimName = match[1].trim().toLowerCase();
                        if (residentNames.has(victimName)) return true;
                    }
                    for (const resName of residentNames) {
                        if (r.involved_biometrics.toLowerCase().includes(resName)) return true;
                    }
                }
                return false;
            });

            fullReportsTableBody.innerHTML = '';
            if (filteredReports.length === 0) {
                fullReportsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94A3B8;">No accident reports found for ${brgyName}.</td></tr>`;
                return;
            }

            filteredReports.forEach(r => {
                const date = new Date(r.datetime).toLocaleString();
                
                let victimName = "No Biometrics";
                let remarksText = "N/A";
                if (r.involved_biometrics) {
                    const match = r.involved_biometrics.match(/Name:\s*([^\n]+)/);
                    if (match) {
                        victimName = match[1].trim();
                    } else {
                        victimName = "Non-Resident / Manual";
                    }
                    
                    if (r.involved_biometrics.includes('\n\nRemarks:\n')) {
                        remarksText = r.involved_biometrics.split('\n\nRemarks:\n')[1].trim();
                    }
                }

                let displayRemarks = `<span style="white-space: pre-wrap; word-break: break-word;">${remarksText}</span>`;
                if (remarksText.length > 25 && remarksText !== 'N/A') {
                    const safeText = remarksText.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
                    const truncated = remarksText.substring(0, 25) + '... <a href="#" onclick="showCustomAlert(\'' + safeText + '\', \'info\', \'Incident Remarks\'); return false;" style="color: #3b82f6; text-decoration: underline; font-weight: 600; white-space: nowrap;">Read More</a>';
                    displayRemarks = `<span>${truncated}</span>`;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${date}</td>
                    <td><div style="font-weight:600; color:#1e293b;">${victimName}</div></td>
                    <td>${r.severity}</td>
                    <td>${r.status}</td>
                    <td style="max-width: 250px;">${displayRemarks}</td>
                `;
                fullReportsTableBody.appendChild(row);
            });
        } catch (e) {
            console.error("Load accident reports error:", e);
            fullReportsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #EF4444;">Failed to load accident reports.</td></tr>`;
        }
    };

    // Fetch and load residents scoped to this Barangay
    const loadResidents = async () => {
        try {
            const { data: residents, error } = await supabase
                .from('residents')
                .select('*')
                .eq('municipality', muniName)
                .eq('barangay', brgyName)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Update stats
            const statsResidents = document.getElementById('stats-residents');
            if (statsResidents) statsResidents.textContent = residents.length;

            // Load residents table
            if (residentsTableBody) {
                residentsTableBody.innerHTML = '';
                if (residents.length === 0) {
                    residentsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px;">No residents registered in this barangay.</td></tr>`;
                } else {
                    residents.forEach(res => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${res.first_name} ${res.last_name}</td>
                            <td>
                                <div style="font-weight:600;">${res.contact_number || 'N/A'}</div>
                                <div style="font-size:11px; color:#EF4444;"><i class='bx bxs-droplet'></i> Blood: ${res.blood_type || 'Unknown'}</div>
                            </td>
                            <td><span style="font-size:12px; color:#64748B;">${res.barangay}, ${res.municipality}</span></td>
                            <td><span class="badge badge-resolved">Verified</span></td>
                        `;
                        residentsTableBody.appendChild(row);
                    });
                }
            }

            // Load dashboard recent table (limit to 5)
            if (recentResidentsTableBody) {
                recentResidentsTableBody.innerHTML = '';
                const recents = residents.slice(0, 5);
                if (recents.length === 0) {
                    recentResidentsTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #94A3B8;">No residents registered yet.</td></tr>`;
                } else {
                    recents.forEach(res => {
                        const dateStr = res.created_at ? new Date(res.created_at).toLocaleDateString() : 'N/A';
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${res.first_name} ${res.last_name}</td>
                            <td>${res.contact_number || 'N/A'}</td>
                            <td>${dateStr}</td>
                        `;
                        recentResidentsTableBody.appendChild(row);
                    });
                }
            }

            // Load accident reports after loading residents
            await loadAccidentReports(residents);

        } catch (e) {
            console.error("Load residents error:", e);
            showCustomAlert("Failed to load residents database.", "error", "Database Error");
        }
    };

    // Save resident record
    if (residentForm) {
        residentForm.onsubmit = async (e) => {
            e.preventDefault();
            const fingerprintId = document.getElementById('resFingerprintId').value;
            
            if (!fingerprintId) {
                showCustomAlert("Fingerprint scan required! Please place the resident's finger on the scanner first.", "error", "Registration Error");
                return;
            }

            const resData = {
                first_name: document.getElementById('resFirstName').value.trim(),
                last_name: document.getElementById('resLastName').value.trim(),
                municipality: muniName,
                barangay: brgyName,
                contact_number: document.getElementById('resContact').value.trim(),
                emergency_contact: document.getElementById('resEmergencyName').value.trim() + " (" + document.getElementById('resEmergencyRelation').value.trim() + ")",
                emergency_phone: document.getElementById('resEmergencyContact').value.trim(),
                blood_type: document.getElementById('resBloodType').value,
                fingerprint_id: fingerprintId,
                medical_info: document.getElementById('resMedical').value.trim(),
                username: 'res_' + Date.now() + Math.floor(Math.random() * 1000),
                password: 'default_password'
            };

            try {
                const { data, error } = await supabase
                    .from('residents')
                    .insert([resData])
                    .select();

                if (error) throw error;

                showCustomAlert("Resident registered successfully!", "success", "Registration Complete");
                residentModal.classList.remove('show');
                loadResidents();
            } catch (err) {
                showCustomAlert(err.message, "error", "Saving Error");
            }
        };
    }

    // 4. BIOMETRIC HARDWARE HARDWARE SCANNER INTEGRATION
    let serialPort = null;
    let scannerActive = false;
    const scannerBtn = document.getElementById('scannerStatusBtn');
    const scannerShortcutBtn = document.getElementById('scannerShortcutBtn');
    const logoFingerprintBtn = document.getElementById('logoFingerprintBtn');
    const registerFingerprintBtn = document.getElementById('registerFingerprintBtn');
    const resRescanBtn = document.getElementById('resRescanBtn');

    function updateScannerUI(status) {
        if (!scannerBtn) return;
        scannerBtn.classList.remove('offline', 'online', 'scanning');
        
        const statusText = document.getElementById('scannerStatusText');
        const helpText = document.getElementById('scannerHelpText');
        const statusIcon = document.getElementById('scannerStatusIcon');

        if (status === 'online') {
            scannerBtn.classList.add('online');
            scannerBtn.title = "Scanner: Ready (Always Listening)";
            
            if (statusText) statusText.textContent = "Online";
            if (statusText) statusText.style.color = "#10B981";
            if (helpText) helpText.textContent = "Ready to scan or enroll";
            if (statusIcon) statusIcon.style.color = "#10B981";
        } else if (status === 'scanning') {
            scannerBtn.classList.add('scanning');
            scannerBtn.title = "Scanner: Processing...";
            
            if (statusText) statusText.textContent = "Scanning...";
            if (statusText) statusText.style.color = "#2563EB";
            if (helpText) helpText.textContent = "Processing fingerprint input";
            if (statusIcon) statusIcon.style.color = "#2563EB";
        } else {
            scannerBtn.classList.add('offline');
            scannerBtn.title = "Scanner: Disconnected (Click to Connect)";
            
            if (statusText) statusText.textContent = "Offline";
            if (statusText) statusText.style.color = "#EF4444";
            if (helpText) helpText.textContent = "Click to connect USB scanner";
            if (statusIcon) statusIcon.style.color = "#94A3B8";
        }
    }

    async function initScannerConnection(requestNew = false) {
        if (window.Capacitor) {
            // Native OTG Logic (Mobile/Android)
            try {
                if (!window.usbserial) {
                    showCustomAlert("USB Serial plugin not found. Please ensure the native plugin is built into the APK.", "error", "Plugin Missing");
                    return;
                }

                const targetDevices = [
                    { vid: '2341', pid: '0043' }, // Uno
                    { vid: '1A86', pid: '7523' }, // CH340
                    { vid: '10C4', pid: 'EA60' }, // CP2102
                    { vid: '0403', pid: '6001' }  // FTDI
                ];

                const tryConnect = (index) => {
                    if (index >= targetDevices.length) {
                        showCustomAlert("No compatible Arduino found. Check OTG connection or enable 'OTG' in settings.", "error", "Hardware Not Found");
                        return;
                    }

                    const dev = targetDevices[index];
                    window.usbserial.requestPermission(dev, () => {
                        window.usbserial.connect({ baudRate: 57600 }, () => {
                            scannerActive = true;
                            updateScannerUI('online');
                            logToTerminal(`Mobile OTG: Connected to Device ${dev.vid}:${dev.pid}`, "SUCCESS");
                            showCustomAlert("Hardware Connected via OTG!", "success", "Hardware Ready");
                            
                            window.usbserial.registerReadCallback((data) => {
                                const view = new Uint8Array(data);
                                let str = "";
                                for (let i = 0; i < view.length; i++) {
                                    str += String.fromCharCode(view[i]);
                                }
                                handleHardwareInput(str);
                            }, (err) => console.error("OTG Read Error:", err));
                        }, (err) => {
                            tryConnect(index + 1);
                        });
                    }, (err) => {
                        tryConnect(index + 1);
                    });
                };

                tryConnect(0);
            } catch (e) {
                console.error("Capacitor OTG Error:", e);
                showCustomAlert("Mobile hardware error: " + e.message, "error");
            }
        } else {
            // Web Serial Logic (Desktop/Chrome/Edge)
            try {
                if (!("serial" in navigator)) {
                    showCustomAlert("Web Serial not supported in this browser. Use Chrome/Edge on Desktop.", "warning");
                    return;
                }

                if (!serialPort) {
                    const ports = await navigator.serial.getPorts();
                    if (ports.length > 0 && !requestNew) {
                        serialPort = ports[0];
                    } else if (requestNew) {
                        serialPort = await navigator.serial.requestPort();
                    }
                }

                if (!serialPort) return;

                if (serialPort.readable === null) {
                    await serialPort.open({ baudRate: 57600 });
                    console.log("Port opened. Waiting 3.5s for Arduino to reboot...");
                    await new Promise(resolve => setTimeout(resolve, 3500));
                }

                if (!scannerActive) {
                    scannerActive = true;
                    updateScannerUI('online');
                    logToTerminal("Desktop: Scanner connected and ready!", "SUCCESS");
                    startBackgroundListener();
                }
            } catch (err) {
                console.error("Scanner Init Error:", err);
                updateScannerUI('offline');
                scannerActive = false;
                showCustomAlert("Connection failed. Ensure hardware is plugged in.", "error");
            }
        }
    }

    async function startBackgroundListener() {
        while (serialPort && serialPort.readable && scannerActive) {
            const decoder = new TextDecoderStream();
            const inputDone = serialPort.readable.pipeTo(decoder.writable);
            const inputStream = decoder.readable;
            const reader = inputStream.getReader();

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    if (value) handleHardwareInput(value);
                }
            } catch (error) {
                console.error("Read error:", error);
            } finally {
                reader.releaseLock();
            }
        }
    }

    let globalSerialBuffer = '';
    let enrollAckTimeout = null;

    async function handleHardwareInput(data) {
        globalSerialBuffer += data;
        
        while (globalSerialBuffer.includes('\n')) {
            const newlineIndex = globalSerialBuffer.indexOf('\n');
            const line = globalSerialBuffer.slice(0, newlineIndex).trim();
            globalSerialBuffer = globalSerialBuffer.slice(newlineIndex + 1);
            
            if (line) {
                console.log("Hardware Line:", line);
                updateScannerUI('scanning');
                
                // 1. COMMAND ACKNOWLEDGMENT
                if (line.includes("CMD_ACK:ENROLL")) {
                    console.log("Arduino successfully entered Enrollment Mode!");
                    logToTerminal("Scanner: Ready for Resident Enrollment. Put thumb on scanner.", "SCANNER");
                    if (enrollAckTimeout) clearTimeout(enrollAckTimeout);
                    showCustomAlert("Arduino is ready! Place the resident's finger on the scanner.", "info", "Scanner Ready");
                }

                // 2. ENROLLMENT (Registration)
                if (line.includes("ENROLLED:")) {
                    const match = line.match(/ENROLLED:(\d+)/);
                    if (match) {
                        const id = match[1];
                        logToTerminal(`FINGERPRINT ENROLLED SUCCESSFULLY: ID ${id}`, "SUCCESS");
                        
                        if (residentModal && residentModal.classList.contains('show')) {
                            const section = document.getElementById('biometricSection');
                            const initialState = document.getElementById('resScannerInitialState');
                            const verifiedState = document.getElementById('resVerifiedState');
                            const displayFpId = document.getElementById('resCapturedFpIdDisplay');
                            const resFingerprintId = document.getElementById('resFingerprintId');
                            const thumb1Status = document.getElementById('thumb1Status');
                            const thumb2Status = document.getElementById('thumb2Status');
                            const instruction = document.getElementById('resScannerInstruction');
                            const registerBtn = document.getElementById('registerFingerprintBtn');

                            if (!resFingerprintId.value) {
                                // First thumb captured
                                resFingerprintId.value = id;
                                if (thumb1Status) {
                                    thumb1Status.innerHTML = "<i class='bx bxs-check-circle'></i> Left Thumb Captured";
                                    thumb1Status.style.background = "#D1FAE5";
                                    thumb1Status.style.color = "#059669";
                                }
                                if (instruction) {
                                    instruction.innerHTML = "<i class='bx bx-info-circle'></i> Please place the resident's RIGHT THUMB on the scanner.";
                                }
                                if (registerBtn) {
                                    registerBtn.innerHTML = "<i class='bx bx-fingerprint'></i> Capture Right Thumb";
                                    registerBtn.style.background = "#EA580C";
                                }
                                showCustomAlert(`Left thumb captured (ID ${id}). Put the right thumb next!`, "success", "Step 1 Complete");
                            } else {
                                // Second thumb captured
                                resFingerprintId.value = resFingerprintId.value + "," + id;
                                if (displayFpId) displayFpId.textContent = resFingerprintId.value;
                                
                                if (thumb2Status) {
                                    thumb2Status.innerHTML = "<i class='bx bxs-check-circle'></i> Right Thumb Captured";
                                    thumb2Status.style.background = "#D1FAE5";
                                    thumb2Status.style.color = "#059669";
                                }

                                if (section) {
                                    section.style.background = '#F0FDF4'; 
                                    section.style.borderColor = '#4ADE80';
                                }
                                if (initialState) initialState.style.display = 'none';
                                if (verifiedState) verifiedState.style.display = 'block';
                                
                                showCustomAlert(`Both thumbs captured successfully! IDs: ${resFingerprintId.value}`, "success", "Hardware Ready");
                            }
                        }
                    }
                } else if (line.includes("ENROLL_FAILED") || line.includes("ENROLL_ERROR")) {
                    console.error("Enrollment failed:", line);
                    logToTerminal(`HARDWARE ERROR: Enrollment Failed: ${line}`, "ERROR");
                    
                    if (line.includes("DUPLICATE")) {
                        showCustomAlert("This fingerprint is already registered in the system! Use another finger.", "warning", "Duplicate Fingerprint");
                    } else {
                        showCustomAlert("Enrollment failed! Please try placing your finger firmly again.", "error", "Hardware Error");
                    }
                    
                    const initialState = document.getElementById('resScannerInitialState');
                    const verifiedState = document.getElementById('resVerifiedState');
                    if (initialState) initialState.style.display = 'block';
                    if (verifiedState) verifiedState.style.display = 'none';
                }

                // 3. IMAGE ERROR HANDLING
                if (line.includes("IMAGE_MESSY") || line.includes("IMAGE_FAIL")) {
                    showCustomAlert("Scan was blurry. Place your finger firmly and try again.", "warning", "Scan Error");
                }
                
                setTimeout(() => updateScannerUI('online'), 1000);
            }
        }
    }

    // Connect trigger
    if (scannerBtn) scannerBtn.onclick = () => initScannerConnection(true);
    if (scannerShortcutBtn) scannerShortcutBtn.onclick = () => initScannerConnection(true);
    if (logoFingerprintBtn) logoFingerprintBtn.onclick = () => initScannerConnection(true);

    if (registerFingerprintBtn) {
        registerFingerprintBtn.onclick = async () => {
            if (!scannerActive) {
                await initScannerConnection(true);
            }
            if (!scannerActive) {
                showCustomAlert("Please connect the fingerprint hardware first!", "error", "Scanner Offline");
                return;
            }

            showCustomAlert("Sending command to scanner... Place finger.", "info", "Waiting for Scanner");

            try {
                if (serialPort && serialPort.writable && !serialPort.writable.locked) {
                    const writer = serialPort.writable.getWriter();
                    const data = new TextEncoder().encode("ENROLL\n");
                    await writer.write(data);
                    writer.releaseLock();
                    
                    if (enrollAckTimeout) clearTimeout(enrollAckTimeout);
                    enrollAckTimeout = setTimeout(() => {
                        showCustomAlert("No response from scanner. Re-plug USB and try again.", "error", "Timeout");
                        if (serialPort) {
                            try { serialPort.close(); } catch(e){}
                            serialPort = null;
                        }
                        scannerActive = false;
                        updateScannerUI('offline');
                    }, 6000);
                } else {
                    showCustomAlert("Cannot write to scanner. Try reconnecting.", "error", "Connection Error");
                }
            } catch (err) {
                console.error("Send command error:", err);
            }
        };
    }

    if (resRescanBtn) {
        resRescanBtn.onclick = () => {
            const section = document.getElementById('biometricSection');
            const initialState = document.getElementById('resScannerInitialState');
            const verifiedState = document.getElementById('resVerifiedState');
            const thumb1Status = document.getElementById('thumb1Status');
            const thumb2Status = document.getElementById('thumb2Status');
            const instruction = document.getElementById('resScannerInstruction');
            const registerBtn = document.getElementById('registerFingerprintBtn');
            
            if (section) {
                section.style.background = '#F0F9FF';
                section.style.borderColor = '#BAE6FD';
            }
            if (initialState) initialState.style.display = 'block';
            if (verifiedState) verifiedState.style.display = 'none';
            
            const resFingerprintId = document.getElementById('resFingerprintId');
            if (resFingerprintId) resFingerprintId.value = '';
            
            if (thumb1Status) {
                thumb1Status.innerHTML = "<i class='bx bx-time'></i> Left Thumb Pending";
                thumb1Status.style.background = "#E0F2FE";
                thumb1Status.style.color = "#0284C7";
            }
            if (thumb2Status) {
                thumb2Status.innerHTML = "<i class='bx bx-time'></i> Right Thumb Pending";
                thumb2Status.style.background = "#E0F2FE";
                thumb2Status.style.color = "#0284C7";
            }
            if (instruction) {
                instruction.innerHTML = "<i class='bx bx-info-circle'></i> To register, please place the resident's LEFT THUMB on the scanner.";
            }
            if (registerBtn) {
                registerBtn.innerHTML = "<i class='bx bx-fingerprint'></i> Capture Left Thumb";
                registerBtn.style.background = "#0369A1";
            }
            
            logToTerminal("Resident enrollment reset for re-capture", "INFO");
        };
    }

    // Alert helper
    window.showCustomAlert = (message, iconCode, title) => {
        const alertBox = document.getElementById('customAlert');
        const alertIcon = document.getElementById('customAlertIcon');
        const alertTitle = document.getElementById('customAlertTitle');
        const alertMessage = document.getElementById('customAlertMessage');

        if (!alertBox) return;

        if (iconCode === 'success') alertIcon.innerHTML = "<i class='bx bx-check-circle' style='color:#10B981'></i>";
        else if (iconCode === 'info') alertIcon.innerHTML = "<i class='bx bx-info-circle' style='color:#0284C7'></i>";
        else if (iconCode === 'warning') alertIcon.innerHTML = "<i class='bx bx-error' style='color:#D97706'></i>";
        else alertIcon.innerHTML = "<i class='bx bx-error-circle' style='color:#EF4444'></i>";

        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertBox.style.display = 'flex';
    };

    // Auto connect scanner on load if available
    initScannerConnection(false);

    // Initial load
    loadResidents();
});
