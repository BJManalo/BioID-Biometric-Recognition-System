document.addEventListener('DOMContentLoaded', () => {
    // SUPABASE INITIALIZATION
    const supabaseUrl = 'https://tzsglayusbbaajvsohtn.supabase.co';
    const supabaseKey = 'sb_publishable_fKtzX1kqT-2Qfi2j_aQoUQ_8dZFCmIa';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    const API_URL = `${window.location.origin}/api`;

    // --- TAB SWITCHING LOGIC ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const headerTitle = document.getElementById('current-tab-title');

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = btn.dataset.tab;

            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(tab => tab.style.display = 'none');
            const targetTab = document.getElementById(tabId + 'Tab');
            if (targetTab) targetTab.style.display = 'block';

            if (headerTitle) headerTitle.textContent = btn.querySelector('.links_name').textContent;

            // Mobile Sidebar Auto-close
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector(".sidebar");
                if (sidebar) sidebar.classList.remove("active");
            }

            // Invalidate Map Size if Map Tab
            if (tabId === 'safemap' && typeof map !== 'undefined') {
                setTimeout(() => map.invalidateSize(), 50);
            }
        });
    });

    // --- RESIDENT DATA HANDLING ---
    const loadResidentData = async () => {
        let resident = null;
        const sessionData = sessionStorage.getItem('activeUserData');
        
        if (sessionData) {
            resident = JSON.parse(sessionData);
            renderProfile(resident);
            fetchIncidentReports(resident.municipality);
        } else {
            // Redirect to login if no session (Production Security)
            window.location.href = '../../index.html';
        }
    };

    const renderProfile = (res) => {
        const full = `${res.first_name} ${res.last_name}`;
        
        // Update welcome texts
        if (document.getElementById('welcome-name')) document.getElementById('welcome-name').textContent = res.first_name;
        if (document.getElementById('resident-name')) document.getElementById('resident-name').textContent = full;
        
        // Update ID Card
        if (document.getElementById('card-name')) document.getElementById('card-name').textContent = full;
        if (document.getElementById('card-muni')) document.getElementById('card-muni').textContent = `Municipality: ${res.municipality}`;
        
        // Update Medical Tab
        if (document.getElementById('med-blood')) document.getElementById('med-blood').textContent = res.blood_type || 'Unknown';
        if (document.getElementById('med-conditions')) document.getElementById('med-conditions').textContent = res.medical_remarks || 'None reported';
        
        // Update settings tab
        if (document.getElementById('biometric-status-text')) {
             document.getElementById('biometric-status-text').textContent = `Your fingerprint is registered and verified under ID: ${res.fingerprint_id || 'F-xxxx'}`;
        }

        // Sidebar avatar update
        const profileImg = document.querySelector('.profile-details img');
        if (profileImg) {
            profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(full)}&background=10B981&color=fff&bold=true`;
        }
    };

    window.showReportModal = (index) => {
        const report = window.currentReports[index];
        if(!report) return;
        
        document.getElementById('v-datetime').textContent = new Date(report.datetime).toLocaleString();
        
        let victimName = "Unidentified";
        if (report.involved_biometrics) {
            const match = report.involved_biometrics.match(/Name:\s*([^\n]+)/);
            if (match) victimName = match[1].trim();
        }
        document.getElementById('v-name').textContent = victimName;
        
        document.getElementById('v-location').textContent = report.location;
        document.getElementById('v-severity').textContent = report.severity;
        document.getElementById('v-officer').textContent = report.reporting_officer || 'PNP';
        
        document.getElementById('viewReportModal').classList.add('show');
    };

    const fetchIncidentReports = async (municipality) => {
        try {
            const { data, error } = await supabase
                .from('accident_reports')
                .select('*')
                .eq('jurisdiction', municipality.trim())
                .order('datetime', { ascending: false });

            if (error) throw error;

            const tbody = document.getElementById('resident-reports-body');
            
            if (data && data.length > 0) {
                window.currentReports = data;
                tbody.innerHTML = '';
                data.forEach((report, index) => {
                    const row = `
                        <tr>
                            <td>${new Date(report.datetime).toLocaleDateString()}</td>
                            <td>${report.location}</td>
                            <td><span class="badge ${getSeverityClass(report.severity)}">${report.severity}</span></td>
                            <td>Officer ${report.reporting_officer || 'PNP'}</td>
                            <td><button class="btn btn-sm btn-outline-primary" onclick="window.showReportModal(${index})">View</button></td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('beforeend', row);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No recent records in ${municipality}. Safe travels!</td></tr>`;
            }
        } catch (err) {
            console.error("Error fetching municipality reports:", err);
            document.getElementById('resident-reports-body').innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Failed to load reports from database</td></tr>`;
        }
    };

    const getSeverityClass = (s) => {
        if (s === 'Minor') return 'badge-success';
        if (s === 'Moderate') return 'badge-pending';
        return 'badge-critical';
    };

    // --- PUBLIC SAFETY MAP INIT ---
    let map;
    const initMap = () => {
        const antiqueBounds = [
            [10.35, 121.30], 
            [12.10, 122.35]  
        ];

        map = L.map('residentRiskMap', {
            zoomControl: false,
            maxBounds: antiqueBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 9
        }).setView([11.15, 122.04], 9);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Fetch areas with high accident count
        fetchHighRiskZones();
    };

    const fetchHighRiskZones = async () => {
        try {
            const { data: reports, error } = await supabase
                .from('accident_reports')
                .select('location, jurisdiction, severity');
            
            if (error) throw error;
            
            // Marker logic based on frequency in data...
            // Mock markers for residents to see hotspots (can be replaced with real geocoding)
            const hotspots = [
                { name: "San Jose Public Plaza Area", lat: 10.74, lng: 121.94, risk: "High" },
                { name: "Sibalom Crossing", lat: 10.78, lng: 122.01, risk: "Moderate" },
                { name: "Hamtic National Highway", lat: 10.71, lng: 121.97, risk: "High" }
            ];

            hotspots.forEach(spot => {
                const color = spot.risk === 'High' ? '#EF4444' : '#F59E0B';
                L.circle([spot.lat, spot.lng], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.5,
                    radius: 800
                }).addTo(map).bindPopup(`<b>${spot.name}</b><br>Risk Level: ${spot.risk}`);
            });

        } catch (err) {
            console.error("Error loading hotspots:", err);
        }
    };

    // --- PORTAL CREDENTIALS MGMT (MODAL) ---
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');
    const settingsUsernameInput = document.getElementById('settingsUsername');
    const settingsPasswordInput = document.getElementById('settingsPassword');
    const toggleSettingsPass = document.getElementById('toggleSettingsPassword');

    // Initial load of values
    const resident = JSON.parse(sessionStorage.getItem('activeUserData'));
    
    const populateSettingsModal = () => {
        if (resident) {
            if (settingsUsernameInput) settingsUsernameInput.value = resident.username || '';
            if (settingsPasswordInput) settingsPasswordInput.value = resident.password || '';
        }
    };

    // Toggle Password Visibility in Modal
    if (toggleSettingsPass) {
        toggleSettingsPass.onclick = () => {
            if (settingsPasswordInput) {
                const type = settingsPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                settingsPasswordInput.setAttribute('type', type);
                toggleSettingsPass.className = type === 'password' ? 'bx bx-hide' : 'bx bx-show';
            }
        };
    }

    // Handle Form Submit
    if (settingsForm) {
        settingsForm.onsubmit = async (e) => {
            e.preventDefault();
            const newUsername = settingsUsernameInput.value.trim();
            const newPassword = settingsPasswordInput.value;

            if (!newUsername || !newPassword) {
                alert("Username and password cannot be empty.");
                return;
            }

            if (!resident || !resident.id) {
                alert("Session issue: Resident ID missing. Please log out and back in.");
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('residents')
                    .update({ 
                        username: newUsername, 
                        password: newPassword 
                    })
                    .eq('id', resident.id)
                    .select();

                if (!error) {
                    // Update local storage
                    resident.username = newUsername;
                    resident.password = newPassword;
                    sessionStorage.setItem('activeUserData', JSON.stringify(resident));
                    
                    alert("Credentials updated successfully!");
                    if (settingsModal) settingsModal.classList.remove('show');
                } else {
                    alert(error.message || "Failed to update credentials.");
                }
            } catch (err) {
                console.error("Save error:", err);
                alert("Connection error or Supabase misconfiguration.");
            }
        };
    }

    // --- PROFILE DROPDOWN ---
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileMenu = document.getElementById('profileMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const settingsDropdownBtn = document.getElementById('openSettingsBtnDropdown');

    if (profileDropdownBtn && profileMenu) {
        profileDropdownBtn.onclick = (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('show');
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            profileMenu.classList.remove('show');
        });
    }

    // LOGOUT LOGIC is now handled directly in index.html via href and onclick for better mobile reliability.


    if (settingsDropdownBtn) {
        settingsDropdownBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            populateSettingsModal();
            if (settingsModal) settingsModal.classList.add('show');
            if (profileMenu) profileMenu.classList.remove('show'); // Close dropdown
        };
    }

    // --- SIDEBAR TOGGLE ---
    const sidebar = document.querySelector(".sidebar");
    const sidebarBtn = document.querySelector(".sidebarBtn");
    if (sidebarBtn) {
        sidebarBtn.onclick = () => {
            sidebar.classList.toggle("active");
        };
    }

    // --- INITIALIZE ---
    loadResidentData();
    initMap();
});
