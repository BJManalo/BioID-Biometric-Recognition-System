document.addEventListener('DOMContentLoaded', async () => {
    // 1. SUPABASE INITIALIZATION
    const supabaseUrl = 'https://tzsglayusbbaajvsohtn.supabase.co';
    const supabaseKey = 'sb_publishable_fKtzX1kqT-2Qfi2j_aQoUQ_8dZFCmIa';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 2. CHECK SESSION
    const activeUserData = JSON.parse(sessionStorage.getItem('activeUserData'));
    if (!activeUserData || activeUserData.role !== 'MDRRMO') {
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

    // Identify Officer & Jurisdiction
    const officerName = `${activeUserData.first_name} ${activeUserData.last_name}`;
    const assignedJurisdiction = activeUserData.municipality;

    // Update UI Profile Name
    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl) profileNameEl.textContent = `${assignedJurisdiction} MDRRMO`;

    const profileImgEl = document.getElementById('profileImg');
    if (profileImgEl) {
        profileImgEl.src = `https://ui-avatars.com/api/?name=${activeUserData.first_name}+${activeUserData.last_name}&background=103155&color=fff`;
    }

    // Update dynamic municipal labels
    document.querySelectorAll('.dynamic-muni').forEach(el => el.textContent = assignedJurisdiction);

    // Fill municipality field on report modal and keep it read-only
    const reportMuniInput = document.getElementById('reportMunicipality');
    if (reportMuniInput) reportMuniInput.value = assignedJurisdiction;

    // Sidebar Logic
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

                // Invalidate maps sizes if shown
                if ((tabName === 'dashboard' || tabName === 'map') && typeof map !== 'undefined') {
                    setTimeout(() => {
                        if (map) map.invalidateSize();
                        if (fullMap) fullMap.invalidateSize();
                    }, 100);
                }
            }
        });
    });

    // Profile Actions / Settings
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

    // Pre-fill settings
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
                    .from('system_users')
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

    // ANTIQUE DATASET FOR BARANGAY SELECTION
    const antiqueData = {
        "Anini-y": ["Bayo Grande", "Bayo Pequeño", "Butuan", "Casay", "Casay Viejo", "Iba", "Igbarabatuan", "Igpalge", "Igtumarom", "Lisub A", "Lisub B", "Mabuyong", "Magdalena", "Nasuli C", "Nato", "Poblacion", "Sagua", "Salvacion", "San Francisco", "San Ramon", "San Roque", "Tagaytay", "Talisayan"],
        "Barbaza": ["Baghari", "Bahuyan", "Beri", "Biga-a", "Binangbang", "Binangbang Centro", "Binanu-an", "Cadiao", "Calapadan", "Capoyuan", "Cubay", "Embrangga-an", "Esparar", "Gua", "Idao", "Igpalge", "Igtunarum", "Integasan", "Ipil", "Jinalinan", "Lanas", "Langcaon", "Lisub", "Lombuyan", "Mablad", "Magtulis", "Marigne", "Mayabay", "Mayos", "Nalusdan", "Narirong", "Palma", "Poblacion", "San Antonio", "San Ramon", "Soligao", "Tabongtabong", "Tig-alaran", "Yapo"],
        "Belison": ["Borocboroc", "Buenavista", "Concepcion", "Delima", "Ipil", "Maradiona", "Mojon", "Poblacion", "Rombang", "Salvacion", "Sinaja"],
        "Bugasong": ["Anilawan", "Arangote", "Bagtason", "Camangahan", "Centro Ilawod", "Centro Ilaya", "Centro Pojo", "Cubay North", "Cubay South", "Guija", "Igbalangao", "Igsoro", "Ilaures", "Jinalinan", "Lacayon", "Maray", "Paliwan", "Pangalcagan", "Sabang East", "Sabang West", "Tagudtud North", "Tagudtud South", "Talisay", "Tica", "Tono-an", "Yapu", "Zaragoza"],
        "Caluya": ["Alegria", "Bacong", "Banago", "Bonbon", "Dawis", "Dionela", "Harigue", "Hininga-an", "Imba", "Masanag", "Poblacion", "Sabang", "Salamento", "Semirara", "Sibato", "Sibay", "Sibolo", "Tinogboc"],
        "Culasi": ["Alojipan", "Bagacay", "Balac-balac", "Batbatan Island", "Batonan Norte", "Batonan Sur", "Bita", "Bitadton Norte", "Bitadton Sur", "Buenavista", "Buhi", "Camancijan", "Caridad", "Carit-an", "Centro Norte", "Centro Poblacion", "Centro Sur", "Condes", "Esperanza", "Fe", "Flores", "Jalandoni", "Janlagasi", "Lamputong", "Lipata", "Magsaysay", "Malacañang", "Malalison Island", "Maniguin", "Naba", "Osorio", "Paningayan", "Salde", "San Antonio", "San Gregorio", "San Juan", "San Luis", "San Pascual", "San Vicente", "Simbola", "Tigbobolo", "Tinabusan", "Tomao", "Valderama"],
        "Hamtic": ["Apdo", "Asluman", "Banawon", "Bia-an", "Bongbongan I-II", "Bongbongan III", "Botbot", "Budbudan", "Buhang", "Calacja I", "Calacja II", "Calala", "Cantulan", "Caridad", "Caromangay", "Casalngan", "Dangcalan", "Del Pilar", "Fabrica", "Funda", "General Fullon", "Gov. Evelio B. Javier", "Guintas", "Igbical", "Igbucagay", "Inabasan", "Ingwan-Batangan", "La Paz", "Linaban", "Malandog", "Mapatag", "Masanag", "Nalihawan", "Pamandayan", "Pasu-Jungao", "Piape I", "Piape II", "Piape III", "Pili 1, 2, 3", "Poblacion 1", "Poblacion 2", "Poblacion 3", "Poblacion 4", "Poblacion 5", "Pu-ao", "Suloc", "Villavert-Jimenez"],
        "Laua-an": ["Bagongbayan", "Banban", "Bongbongan", "Cabariwan", "Cadajug", "Canituan", "Capnayan", "Casit-an", "Guiamon", "Guinbanga-an", "Guisijan", "Igtadiao", "Intao", "Jaguikican", "Jinalinan", "Lactudan", "Latazon", "Laua-an", "Liberato", "Lindero", "Liya-liya", "Loon", "Lugta", "Lupa-an", "Magyapo", "Maria", "Mauno", "Maybunga", "Necesito", "Oloc", "Omlot", "Pandanan", "Paningayan", "Pascuala", "Poblacion", "San Ramon", "Santiago", "Tibacan", "Tigunhao", "Virginia"],
        "Libertad": ["Barusbus", "Bulanao", "Centro Este", "Centro Weste", "Codiong", "Cubay", "Igcagay", "Inyawan", "Lindero", "Maramig", "Pajo", "Panangkilon", "Paz", "Pucio", "San Roque", "Taboc", "Tinigbas", "Tinindugan", "Union"],
        "Pandan": ["Aracay", "Badiangan", "Bagumbayan", "Baybay", "Botbot", "Buang", "Cabugao", "Candari", "Carmen", "Centro Norte", "Centro Sur", "Dionela", "Dumrog", "Duyong", "Fragante", "Guia", "Idiacacan", "Jinalinan", "Luhod-Bayang", "Maadios", "Mag-aba", "Napuid", "Nauring", "Patria", "Perfecta", "San Andres", "San Joaquin", "Santa Ana", "Santa Cruz", "Santa Fe", "Santo Rosario", "Talisay", "Tingib", "Zaldivar"],
        "Patnongon": ["Alvañiz", "Amparo", "Apgahan", "Aureliana", "Badiangan", "Bernaldo A. Julagting", "Carit-an", "Cuyapiao", "Gella", "Igbarawan", "Igbobon", "Igburi", "La Rioja", "Mabasa", "Macarina", "Magarang", "Magsaysay", "Padang", "Pandanan", "Patlabawon", "Poblacion", "Quezon", "Salaguiawan", "Samalague", "San Rafael", "Tamayoc", "Tigbalogo", "Tobias Fornier", "Villa Crespo", "Villa Cruz", "Villa Elio", "Villa Flores", "Villa Laua-an", "Villa Sal", "Villa Salomon", "Vista Alegre"],
        "San Jose de Buenavista": ["Atabay", "Badiang", "Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5", "Barangay 6", "Barangay 7", "Barangay 8", "Bariri", "Bugarot", "Cansadan", "Durog", "Funda-Dalipe", "Igbonglo", "Inabasan", "Madrangca", "Magcalon", "Malaiba", "Maybato Norte", "Maybato Sur", "Mojon", "Pantao", "San Angel", "San Fernando", "San Pedro", "Supa"],
        "San Remigio": ["Agricula", "Alegria", "Aningalan", "Atabay", "Bagumbayan", "Baladjay", "Banbanan", "Barangbang", "Bawang", "Bugo", "Bulan-bulan", "Cabiawan", "Cabunga-an", "Cadolonan", "Carawisan I", "Carawisan II", "Carmelo I", "Carmelo II", "General Fullon", "General Luna", "Iguirindon", "Insubuan", "La Union", "Lapak", "Lumpatan", "Magdalena", "Maragubdub", "Nagbangi I", "Nagbangi II", "Nasuli", "Orquia", "Osorio I", "Osorio II", "Panpanan I", "Panpanan II", "Poblacion", "Ramon Magsaysay", "Rizal", "San Rafael", "Sinundolan", "Sumaray", "Trinidad", "Tubudan", "Vilvar", "Walker"],
        "Sebaste": ["Abiera", "Aguila", "Alegre", "Aras-asan", "Bacalan", "Callan", "Idio", "Nauhon", "P. Javier", "Poblacion"],
        "Sibalom": ["Alangan", "Bari", "Biga-a", "Bongbongan I", "Bongbongan II", "Bongsod", "Bontol", "Bugnay", "Bulalacao", "Cabanbanan", "Cabariuan", "Cabladan", "Cadoldolan", "Calo-oy", "Calog", "Catmon", "Catungan I", "Catungan II", "Catungan III", "Catungan IV", "Cubay-Napultan", "Cubay-Sermon", "District I", "District II", "District III", "District IV", "Egaña", "Esperanza I", "Esperanza II", "Esperanza III", "Igcococ", "Igdagmay", "Igdalaquit", "Iglanot", "Igpanolong", "Igparas", "Igsuming", "Ilabas", "Imparayan", "Inabasan", "Indag-an", "Initan", "Insarayan", "Lacaron", "Lagdo", "Lambayagan", "Luna", "Luyang", "Maasin", "Mabini", "Millamena", "Mojon", "Nagdayao", "Nazareth", "Odiong", "Olaga", "Pangpang", "Panlagangan", "Pantao", "Pasong", "Pis-anan", "Rombang", "Salvacion", "San Juan", "Sido", "Solong", "Tabongtabong", "Tig-ohot", "Tigbalua I", "Tigbalua II", "Tordesillas", "Tulatula", "Valentin Grasparil", "Villafont", "Villahermosa", "Villar"],
        "Tibiao": ["Alegre", "Amar", "Bandoja", "Castillo", "Esparagoza", "Importante", "La Paz", "Malabor", "Martinez", "Natividad", "Pitac", "Poblacion", "Salazar", "San Francisco Norte", "San Francisco Sur", "San Isidro", "Santa Ana", "Santa Justa", "Santo Rosario", "Tigbaboy", "Tuno"],
        "Tobias Fornier": ["Abaca", "Aras-asan", "Arobo", "Atabay", "Atiotes", "Bagumbayan", "Balloscas", "Balud", "Barasanan A", "Barasanan B", "Barasanan C", "Bariri", "Camandagan", "Cato-ogan", "Danawan", "Diclum", "Fatima", "Gamad", "Igbalogo", "Igbangcal-A", "Igbangcal-B", "Igbangcal-C", "Igcabuad", "Igcadac", "Igcado", "Igcalawagan", "Igcapuyas", "Igcasicad", "Igdalaguit", "Igdanlog", "Igdurarog", "Igtugas", "Lawigan", "Lindero", "Manaling", "Masayo", "Nagsubuan", "Nasuli-A", "Opsan", "Paciencia", "Poblacion Norte", "Poblacion Sur", "Portillo", "Quezon", "Salamague", "Santo Tomas", "Tacbuyan", "Tene", "Villaflor", "Ysulat"],
        "Valderrama": ["Alon", "Bakiang", "Binanogan", "Borocboroc", "Bugnay", "Buluangan I", "Buluangan II", "Bunsod", "Busog", "Cananghan", "Canipayan", "Cansilayan", "Culyat", "Iglinab", "Igmasandig", "Lublub", "Manlacbo", "Pandanan", "San Agustin", "Takas", "Tigmamale", "Ubos"]
    };

    // Populate Barangay dropdown for the Report Modal
    const locInput = document.getElementById('reportLocation');
    if (locInput && assignedJurisdiction && antiqueData[assignedJurisdiction]) {
        locInput.innerHTML = '<option value="" disabled selected>Select Barangay</option>';
        antiqueData[assignedJurisdiction].sort().forEach(brgy => {
            const opt = document.createElement('option');
            opt.value = brgy;
            opt.textContent = brgy;
            locInput.appendChild(opt);
        });
    }

    // Populate Barangay filter on Residents tab
    const filterBrgy = document.getElementById('filterBarangay');
    if (filterBrgy && assignedJurisdiction && antiqueData[assignedJurisdiction]) {
        filterBrgy.innerHTML = '<option value="" selected>All Barangays</option>';
        antiqueData[assignedJurisdiction].sort().forEach(brgy => {
            const opt = document.createElement('option');
            opt.value = brgy;
            opt.textContent = brgy;
            filterBrgy.appendChild(opt);
        });

        filterBrgy.onchange = () => {
            loadResidents();
        };
    }

    // 5. ACCIDENT REPORTS CRUD
    const openAddReportBtn = document.getElementById('openAddReportBtn');
    const closeReportBtn = document.getElementById('closeReportBtn');
    const cancelReportBtn = document.getElementById('cancelReportBtn');
    const reportModal = document.getElementById('reportModal');
    const reportForm = document.getElementById('reportForm');
    const fullReportsTableBody = document.getElementById('fullReportsTableBody');

    const openReportModal = (report = null) => {
        reportForm.reset();
        
        // Setup initial default values
        document.getElementById('reportId').value = '';
        if (reportMuniInput) reportMuniInput.value = assignedJurisdiction;
        
        // Reset Biometrics Identification UI
        const scannerInitialState = document.getElementById('scannerInitialState');
        const verifiedState = document.getElementById('verifiedState');
        const victimInfoArea = document.getElementById('victimInfoArea');
        if (scannerInitialState) scannerInitialState.style.display = 'block';
        if (verifiedState) verifiedState.style.display = 'none';
        if (victimInfoArea) victimInfoArea.style.display = 'none';

        const saveReportBtn = document.getElementById('saveReportBtn');
        if (saveReportBtn) saveReportBtn.disabled = false;

        const dateInput = document.getElementById('reportDateTime');
        const locInput = document.getElementById('reportLocation');
        const sevInput = document.getElementById('reportSeverity');
        const statInput = document.getElementById('reportStatus');
        const invInput = document.getElementById('reportInvolved');
        const remInput = document.getElementById('reportRemarks');

        if (report) {
            document.getElementById('reportModalTitle').textContent = "Edit Incident Report";
            document.getElementById('reportId').value = report.id;
            
            // Format datetime-local
            const d = new Date(report.datetime);
            const formattedDate = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + 'T' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0');
            if (dateInput) dateInput.value = formattedDate;

            if (locInput) locInput.value = report.location;
            if (sevInput) sevInput.value = report.severity;
            if (statInput) statInput.value = report.status;
            
            let invText = report.involved_biometrics || '';
            if (remInput) remInput.value = '';
            
            if (invText.includes('\n\nRemarks:\n')) {
                const parts = invText.split('\n\nRemarks:\n');
                if (invInput) invInput.value = parts[0];
                if (remInput) remInput.value = parts[1];
            } else {
                if (invInput) invInput.value = invText;
            }

            // If it had identified biometrics, show match UI
            if (invText.includes("VICTIM IDENTIFIED AUTOMATICALLY")) {
                if (scannerInitialState) scannerInitialState.style.display = 'none';
                if (verifiedState) verifiedState.style.display = 'flex';
                if (victimInfoArea) {
                    victimInfoArea.style.display = 'block';
                    const nameMatch = invText.match(/Name:\s*([^\n]+)/);
                    const name = nameMatch ? nameMatch[1].trim() : "Resident";
                    const bloodMatch = invText.match(/Blood Type:\s*([^\n]+)/);
                    const blood = bloodMatch ? bloodMatch[1].trim() : "Unknown";

                    document.getElementById('victimNameText').textContent = name;
                    document.getElementById('victimAddressText').innerHTML = `${report.location || brgyName}, ${report.municipality || muniName} <br> <span style="color:#EF4444; font-weight:700;">Blood Type: ${blood}</span>`;
                }
            }
        } else {
            document.getElementById('reportModalTitle').textContent = "Add Incident Report";
            
            // Prefill current local datetime-local
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
            if (dateInput) dateInput.value = localISOTime;
        }

        reportModal.classList.add('show');
    };

    if (openAddReportBtn) openAddReportBtn.onclick = () => openReportModal(null);
    if (closeReportBtn) closeReportBtn.onclick = () => reportModal.classList.remove('show');
    if (cancelReportBtn) cancelReportBtn.onclick = () => reportModal.classList.remove('show');

    if (reportForm) {
        reportForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('reportId').value;
            let finalInvolved = document.getElementById('reportInvolved').value.trim();
            const remarksVal = document.getElementById('reportRemarks').value.trim();
            if (remarksVal) {
                finalInvolved += "\n\nRemarks:\n" + remarksVal;
            }

            const reportData = {
                datetime: document.getElementById('reportDateTime').value,
                municipality: assignedJurisdiction,
                location: document.getElementById('reportLocation').value,
                severity: document.getElementById('reportSeverity').value,
                status: document.getElementById('reportStatus').value,
                involved_biometrics: finalInvolved,
                reporting_officer: officerName
            };

            try {
                if (id) {
                    const { error } = await supabase
                        .from('accident_reports')
                        .update(reportData)
                        .eq('id', id);
                    if (error) throw error;
                    showCustomAlert("Incident report updated successfully!", "success", "Report Saved");
                } else {
                    const { error } = await supabase
                        .from('accident_reports')
                        .insert([reportData]);
                    if (error) throw error;
                    showCustomAlert("Incident report created successfully!", "success", "Report Saved");
                }

                reportModal.classList.remove('show');
                await fetchAndRenderAll();
            } catch (err) {
                console.error(err);
                showCustomAlert("Error saving report: " + err.message, "error", "Sync Error");
            }
        };
    }

    const deleteReport = async (id) => {
        showCustomConfirm(
            "Are you sure you want to delete this report? This action cannot be undone.",
            "Delete Report",
            async () => {
                try {
                    const { error } = await supabase
                        .from('accident_reports')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                    
                    showCustomAlert("Report deleted successfully.", "success", "Deleted");
                    await fetchAndRenderAll();
                } catch (err) {
                    console.error(err);
                    showCustomAlert("Delete failed.", "error", "Error");
                }
            }
        );
    };

    const fetchAndRenderAll = async () => {
        try {
            // Fetch reports scoped to this municipality
            const { data: reports, error } = await supabase
                .from('accident_reports')
                .select('*')
                .eq('municipality', assignedJurisdiction)
                .order('datetime', { ascending: false });

            if (error) throw error;

            renderReports(reports);
            updateStatsAndCharts(reports);
            await plotReportsOnMap(reports);
            await loadResidents(); // Refresh residents count scoped to municipal
        } catch (error) {
            console.error('Fetch reports error:', error);
        }
    };

    const renderReports = (reports) => {
        if (!fullReportsTableBody) return;
        fullReportsTableBody.innerHTML = '';

        if (!reports || reports.length === 0) {
            fullReportsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#94A3B8;">No reports found for ${assignedJurisdiction}.</td></tr>`;
            return;
        }

        reports.forEach(r => {
            const row = document.createElement('tr');
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

            row.innerHTML = `
                <td>${date}</td>
                <td><div style="font-weight:600; color:#1e293b;">${victimName}</div></td>
                <td>${r.location}</td>
                <td>${r.severity}</td>
                <td>${r.status}</td>
                <td style="max-width: 250px;">${displayRemarks}</td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: nowrap; align-items: center; justify-content: center;">
                        <button class="btn-action btn-edit" title="Edit"><i class='bx bx-edit'></i></button>
                        <button class="btn-action btn-delete" title="Delete"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;

            row.querySelector('.btn-edit').onclick = () => openReportModal(r);
            row.querySelector('.btn-delete').onclick = () => deleteReport(r.id);
            fullReportsTableBody.appendChild(row);
        });
    };

    const updateStatsAndCharts = (reports) => {
        // Update stats card
        const statsAccidents = document.getElementById('stats-accidents');
        if (statsAccidents) statsAccidents.textContent = reports.length;

        const statsAccidentsHero = document.getElementById('stats-accidents-hero');
        if (statsAccidentsHero) statsAccidentsHero.textContent = reports.length;

        const criticalReports = reports.filter(r => r.severity === 'Critical' || r.severity === 'Severe');
        const statsCritical = document.getElementById('stats-critical');
        if (statsCritical) statsCritical.textContent = criticalReports.length;

        // Group reports by Barangay (location) for chart
        const locationCounts = {};
        if (antiqueData[assignedJurisdiction]) {
            antiqueData[assignedJurisdiction].forEach(brgy => {
                locationCounts[brgy] = 0;
            });
        }

        reports.forEach(r => {
            if (r.location && locationCounts.hasOwnProperty(r.location)) {
                locationCounts[r.location]++;
            } else if (r.location) {
                locationCounts[r.location] = 1;
            }
        });

        // Filter out barangays with 0 accidents to keep chart tidy, unless there are none
        let sortedEntries = Object.entries(locationCounts)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);

        if (sortedEntries.length === 0) {
            sortedEntries = [['No incidents', 0]];
        }

        const labels = sortedEntries.map(e => e[0]);
        const data = sortedEntries.map(e => e[1]);

        if (muniChart) {
            muniChart.data.labels = labels;
            muniChart.data.datasets[0].data = data;
            
            // Adjust height dynamically based on data size to avoid compression
            muniChart.options.scales.x.ticks.maxRotation = 0;
            muniChart.options.scales.x.ticks.minRotation = 0;
            
            muniChart.update('none');
        }
    };

    // 6. INITIALIZE MAPS & GEOLOCATION
    let map, fullMap;
    let markerLayer = L.layerGroup();
    let fullMarkerLayer = L.layerGroup();
    const geocodeCache = {};

    const geocodeAndPlot = async (report) => {
        const key = `${report.location}, ${report.municipality}`;
        let coords = geocodeCache[key];

        if (!coords) {
            try {
                const query = `${report.location}, ${report.municipality}, Antique, Philippines`;
                const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(query)}&maxLocations=1`;
                const response = await fetch(url);
                const data = await response.json();

                if (data && data.candidates && data.candidates.length > 0) {
                    coords = [parseFloat(data.candidates[0].location.y), parseFloat(data.candidates[0].location.x)];
                    geocodeCache[key] = coords;
                } else {
                    const fbQuery = `${report.municipality}, Antique, Philippines`;
                    const fbUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(fbQuery)}&maxLocations=1`;
                    const fbResp = await fetch(fbUrl);
                    const fbData = await fbResp.json();
                    
                    if (fbData && fbData.candidates && fbData.candidates.length > 0) {
                        coords = [parseFloat(fbData.candidates[0].location.y), parseFloat(fbData.candidates[0].location.x)];
                    }
                }
            } catch (err) {
                console.error("Geocoding error:", err);
            }
        }

        if (coords) {
            const jitteredCoords = [
                coords[0] + (Math.random() - 0.5) * 0.0001,
                coords[1] + (Math.random() - 0.5) * 0.0001
            ];
            
            const markerOptions = {
                radius: 6,
                fillColor: '#3b82f6',
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            };

            const popupContent = `
                <div style="font-family: inherit; padding: 5px;">
                    <strong style="color: #103155; display: block; margin-bottom: 5px;">${report.location}</strong>
                    <span style="font-size: 12px; color: #64748B;">
                        Severity: <b>${report.severity}</b><br>
                        Status: <b>${report.status}</b><br>
                        Date: ${new Date(report.datetime).toLocaleDateString()}
                    </span>
                </div>
            `;

            if (map) {
                L.circleMarker(jitteredCoords, markerOptions).bindPopup(popupContent).addTo(markerLayer);
            }
            if (fullMap) {
                L.circleMarker(jitteredCoords, markerOptions).bindPopup(popupContent).addTo(fullMarkerLayer);
            }
        }
    };

    const plotReportsOnMap = async (reports) => {
        markerLayer.clearLayers();
        fullMarkerLayer.clearLayers();
        for (const r of reports) {
            await geocodeAndPlot(r);
        }
    };

    const initMaps = async () => {
        const commonOptions = { zoomControl: false, minZoom: 11 };
        const riskMapEl = document.getElementById('riskMap');
        const fullRiskMapEl = document.getElementById('fullRiskMap');

        if (riskMapEl) {
            map = L.map('riskMap', commonOptions).setView([11.15, 122.04], 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                attribution: '&copy; CartoDB'
            }).addTo(map);
            markerLayer.addTo(map);
        }

        if (fullRiskMapEl) {
            fullMap = L.map('fullRiskMap', commonOptions).setView([11.15, 122.04], 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                attribution: '&copy; CartoDB'
            }).addTo(fullMap);
            fullMarkerLayer.addTo(fullMap);
        }

        // Fetch precise boundary once for municipality and zoom
        fetch(`https://nominatim.openstreetmap.org/search.php?q=${assignedJurisdiction},+Antique,+Philippines&polygon_geojson=1&format=jsonv2`)
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0 && data[0].geojson) {
                    const style = { opacity: 0, fillOpacity: 0 };
                    if (map) {
                        const geoLayer1 = L.geoJSON(data[0].geojson, { style }).addTo(map);
                        map.fitBounds(geoLayer1.getBounds());
                    }
                    if (fullMap) {
                        const geoLayer2 = L.geoJSON(data[0].geojson, { style }).addTo(fullMap);
                        fullMap.fitBounds(geoLayer2.getBounds());
                    }
                }
            }).catch(e => console.error("Boundary fetch failed", e));
    };

    // 7. CHART LOGIC
    let muniChart;
    const initChart = () => {
        const chartCtx = document.getElementById('municipalityChart');
        if (!chartCtx) return;

        const ctx = chartCtx.getContext('2d');
        muniChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['No Data'],
                datasets: [{
                    label: 'Total Incidents',
                    data: [0],
                    backgroundColor: '#103155',
                    borderRadius: 4,
                    barThickness: 15
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        min: 0,
                        ticks: {
                            stepSize: 1,
                            font: { size: 12, weight: 'bold' }
                        },
                        grid: { color: 'rgba(0,0,0,0.03)' }
                    },
                    y: {
                        ticks: {
                            font: { size: 11 },
                            autoSkip: false
                        },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                },
                layout: {
                    padding: { top: 10, bottom: 10, left: 10, right: 30 }
                }
            }
        });
    };

    // 8. READ-ONLY RESIDENTS LIST FOR JURISDICTION
    const residentsTableBody = document.getElementById('residentsTableBody');
    const loadResidents = async () => {
        if (!residentsTableBody) return;
        try {
            let query = supabase
                .from('residents')
                .select('*')
                .eq('municipality', assignedJurisdiction);

            if (filterBrgy && filterBrgy.value) {
                query = query.eq('barangay', filterBrgy.value);
            }

            const { data: residents, error } = await query;
            if (error) throw error;

            // Update registered count
            const statsResidents = document.getElementById('stats-residents');
            if (statsResidents) statsResidents.textContent = residents.length;

            residentsTableBody.innerHTML = '';
            if (residents.length === 0) {
                residentsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px;">No registered residents found in this jurisdiction.</td></tr>`;
                return;
            }

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
        } catch (e) {
            console.error("Residents load failed:", e);
        }
    };

    // 9. WEB SERIAL SCANNER BIOMETRIC INTEGRATION (Always-Listening & Victim Scan)
    let serialPort = null;
    let scannerActive = false;
    const scannerBtn = document.getElementById('scannerStatusBtn');
    const logoFingerprintBtn = document.getElementById('logoFingerprintBtn');
    const scanVictimBtn = document.getElementById('scanVictimBtn');
    const resetIdentificationBtn = document.getElementById('resetIdentificationBtn');

    function updateScannerUI(status) {
        if (!scannerBtn) return;
        scannerBtn.classList.remove('offline', 'online', 'scanning');
        if (status === 'online') {
            scannerBtn.classList.add('online');
            scannerBtn.title = "Scanner: Ready (Always Listening)";
        } else if (status === 'scanning') {
            scannerBtn.classList.add('scanning');
            scannerBtn.title = "Scanner: Processing Fingerprint...";
        } else {
            scannerBtn.classList.add('offline');
            scannerBtn.title = "Scanner: Disconnected (Click to Connect)";
        }
    }

    async function initScannerConnection(requestNew = false) {
        if (window.Capacitor) {
            // Native OTG Support
            try {
                if (!window.usbserial) {
                    showCustomAlert("USB Serial plugin not found.", "error", "Plugin Missing");
                    return;
                }

                const targetDevices = [
                    { vid: '2341', pid: '0043' },
                    { vid: '1A86', pid: '7523' },
                    { vid: '10C4', pid: 'EA60' },
                    { vid: '0403', pid: '6001' }
                ];

                const tryConnect = (index) => {
                    if (index >= targetDevices.length) {
                        showCustomAlert("No compatible Arduino found. Check USB OTG settings.", "error", "Hardware Not Found");
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
                        }, () => tryConnect(index + 1));
                    }, () => tryConnect(index + 1));
                };

                tryConnect(0);
            } catch (e) {
                console.error("Capacitor OTG Error:", e);
            }
        } else {
            // Web Serial Logic
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
    async function handleHardwareInput(data) {
        globalSerialBuffer += data;
        
        while (globalSerialBuffer.includes('\n')) {
            const newlineIndex = globalSerialBuffer.indexOf('\n');
            const line = globalSerialBuffer.slice(0, newlineIndex).trim();
            globalSerialBuffer = globalSerialBuffer.slice(newlineIndex + 1);
            
            if (line) {
                console.log("Hardware Line:", line);
                updateScannerUI('scanning');
                
                // HANDLE BIOMETRIC MATCH (Victim Identification Lookup)
                if (line.includes("MATCH_ID:")) {
                    const match = line.match(/MATCH_ID:(\d+)/);
                    if (match) {
                        const id = match[1];
                        logToTerminal(`SCANNER: Analyzing Fingerprint (Match found: ${id})`, "SCANNER");
                        await autoIdentifyVictim(id);
                    }
                } else if (line.includes("MATCH_FAILED") || line.includes("NOT_FOUND")) {
                    console.warn("Hardware Identification Failed:", line);
                    logToTerminal("SCANNER: Identity Not Found in Hardware Database", "WARNING");
                    if (!reportModal.classList.contains('show')) {
                        showCustomAlert("Fingerprint not recognized. Verify resident registration.", "warning", "Identity Unknown");
                    }
                }
                
                if (line.includes("IMAGE_MESSY") || line.includes("IMAGE_FAIL")) {
                    showCustomAlert("Scan was blurry. Place finger firmly and scan again.", "warning", "Scan Error");
                }
                
                setTimeout(() => updateScannerUI('online'), 1000);
            }
        }
    }

    async function autoIdentifyVictim(hardwareId) {
        try {
            console.log(`Searching for resident with Fingerprint ID: ${hardwareId}`);
            
            const { data: allMatches, error } = await supabase
                .from('residents')
                .select('*')
                .ilike('fingerprint_id', `%${hardwareId}%`);

            if (error) throw error;
            
            // Filter locally to ensure exact comma-separated ID matches (prevent ID 4 matching 14)
            const residents = allMatches ? allMatches.filter(r => 
                r.fingerprint_id && r.fingerprint_id.split(',').includes(String(hardwareId))
            ) : [];

            if (residents.length === 0) {
                logToTerminal(`Match found for ID ${hardwareId}, but no resident found in Supabase.`, "WARNING");
                showCustomAlert(`Scanner recognized ID ${hardwareId}, but resident details are not registered.`, "warning", "Unknown Resident");
                return;
            }

            const person = residents[0];
            logToTerminal(`VICTIM IDENTIFIED: ${person.first_name} ${person.last_name}`, "SUCCESS");

            // SEND NAME TO ARDUINO LCD DISPLAY
            if (scannerActive && serialPort && serialPort.writable) {
                try {
                    const writer = serialPort.writable.getWriter();
                    let shortName = (`${person.first_name} ${person.last_name}`).substring(0, 16);
                    let shortContact = (person.emergency_phone || 'None').substring(0, 16);
                    const data = new TextEncoder().encode(`DISPLAY_VICTIM:${shortName}|${shortContact}\n`);
                    await writer.write(data);
                    writer.releaseLock();
                    logToTerminal(`LCD Updated with Victim Info`, "INFO");
                } catch (hwErr) {
                    console.error("LCD display command failed", hwErr);
                }
            }

            // Ensure the Report Modal is open to prefill victim details
            if (!reportModal.classList.contains('show')) {
                openReportModal(null);
            }

            // Prefill victim data into form inputs
            setTimeout(() => {
                const victimInfoArea = document.getElementById('victimInfoArea');
                const victimNameText = document.getElementById('victimNameText');
                const victimAddressText = document.getElementById('victimAddressText');
                const involvedInput = document.getElementById('reportInvolved');
                const locInput = document.getElementById('reportLocation');

                // If the resident is from the same municipality, auto-select their Barangay if available
                if (person.municipality === assignedJurisdiction && locInput) {
                    locInput.value = person.barangay;
                }

                if (victimInfoArea) victimInfoArea.style.display = 'block';
                if (victimNameText) victimNameText.textContent = `${person.first_name} ${person.last_name}`;
                if (victimAddressText) {
                    victimAddressText.innerHTML = `${person.barangay}, ${person.municipality} <br> <span style="color:#EF4444; font-weight:700;">Blood Type: ${person.blood_type || 'Unknown'}</span>`;
                }
                
                if (involvedInput) {
                    involvedInput.value = `VICTIM IDENTIFIED AUTOMATICALLY\nName: ${person.first_name} ${person.last_name}\nBlood Type: ${person.blood_type || 'Unknown'}\nMedical: ${person.medical_info || 'None'}\nEmergency: ${person.emergency_contact || 'None'} (${person.emergency_phone || 'N/A'})`;
                    involvedInput.style.height = 'auto';
                    involvedInput.style.height = involvedInput.scrollHeight + 'px';
                }
                
                const scannerInitialState = document.getElementById('scannerInitialState');
                const verifiedState = document.getElementById('verifiedState');
                if (scannerInitialState) scannerInitialState.style.display = 'none';
                if (verifiedState) verifiedState.style.display = 'flex';

                showCustomAlert(`Resident identity verified: ${person.first_name} ${person.last_name}`, "success", "Identity Verified");
            }, 100);

        } catch (err) {
            console.error("Identification Error:", err);
            showCustomAlert("Error connecting to database during identification.", "error", "Database Error");
        }
    }

    if (scanVictimBtn) {
        scanVictimBtn.onclick = async () => {
            if (!scannerActive) {
                await initScannerConnection(true);
            }
            if (scannerActive) {
                showCustomAlert("Place the victim's finger on the hardware scanner.", "info", "Scanner Active");
            } else {
                showCustomAlert("Scanner not connected. Pair it at the top status bar.", "error", "Offline");
            }
        };
    }

    if (resetIdentificationBtn) {
        resetIdentificationBtn.onclick = () => {
            const scannerInitialState = document.getElementById('scannerInitialState');
            const verifiedState = document.getElementById('verifiedState');
            const victimInfoArea = document.getElementById('victimInfoArea');
            const involvedInput = document.getElementById('reportInvolved');

            if (scannerInitialState) scannerInitialState.style.display = 'block';
            if (verifiedState) verifiedState.style.display = 'none';
            if (victimInfoArea) victimInfoArea.style.display = 'none';
            if (involvedInput) involvedInput.value = '';
            
            logToTerminal("MDRRMO identification reset", "INFO");
        };
    }

    if (scannerBtn) scannerBtn.onclick = () => initScannerConnection(true);
    if (logoFingerprintBtn) logoFingerprintBtn.onclick = () => initScannerConnection(true);

    // Helpers
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

    window.showCustomConfirm = (message, title, onConfirm) => {
        const confirmBox = document.getElementById('customConfirm');
        const confirmTitle = document.getElementById('customConfirmTitle');
        const confirmMessage = document.getElementById('customConfirmMessage');
        const okBtn = document.getElementById('customConfirmOk');
        const cancelBtn = document.getElementById('customConfirmCancel');

        if (!confirmBox) return;

        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmBox.style.display = 'flex';

        const handleConfirm = () => {
            confirmBox.style.display = 'none';
            okBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            onConfirm();
        };

        const handleCancel = () => {
            confirmBox.style.display = 'none';
            okBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        okBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    };

    // Auto-expanding textareas
    document.querySelectorAll('.textarea-auto').forEach(ta => {
        ta.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    });

    // Start Everything
    await initMaps();
    initChart();
    await fetchAndRenderAll();
    initScannerConnection(false);
});
