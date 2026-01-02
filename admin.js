document.addEventListener('DOMContentLoaded', async () => {
    const userRole = localStorage.getItem('userRole');
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
        window.location.href = '/login';
        return;
    }

    // Role Check for UI (Backend checks too)
    if (userRole === 'guest') {
        alert('Misafir hesabıyla sadece görüntüleme yapabilirsiniz. Düzenleme yetkiniz yok.');
        // Hide edit features visually if needed, but we'll enforce on save
        document.querySelectorAll('button[type="submit"]').forEach(b => b.disabled = true);
        document.querySelectorAll('.btn-success, .btn-primary, .btn-danger').forEach(b => b.disabled = true);
    }

    const AUTH_TOKEN = authToken;
    let currentContent = {}; // Stores the full site state

    // --- DOM Elements ---
    const views = {
        dashboard: document.getElementById('view-dashboard'),
        'hero-about': document.getElementById('view-hero-about'),
        skills: document.getElementById('view-skills'),
        portfolio: document.getElementById('view-portfolio'),
        contact: document.getElementById('view-contact')
    };
    const pageTitle = document.getElementById('page-title');
    const sidebarLinks = document.querySelectorAll('.sidebar .nav-link');

    // --- Navigation Logic ---
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebarToggle = document.getElementById('sidebarToggle');

    // Toggle Sidebar (Mobile)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        });
    }

    // Close Sidebar when clicking overlay
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Auto-close sidebar on mobile when a link is clicked
            if (window.innerWidth < 768) {
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
            }

            // Active State
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // View Switching
            const viewName = link.dataset.view;
            Object.values(views).forEach(el => el.classList.add('d-none'));
            if(views[viewName]) views[viewName].classList.remove('d-none');

            // Title Update
            pageTitle.textContent = link.textContent.trim();
        });
    });

    // --- Logout ---
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('userRole');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    });

    // --- Data Fetching ---
    const fetchData = async () => {
        try {
            // 1. İçeriği Çek (Herkes görebilir)
            const contentRes = await fetch('/api/content');
            currentContent = await contentRes.json();

            // Populate Editors (İçerik her durumda gösterilmeli)
            populateHeroAbout();
            renderSkillsTable();
            renderPortfolioTable();
            renderContactsTable();

            // 2. Mesajları Çek (Sadece Admin yetkisiyle)
            try {
                const messagesRes = await fetch('/api/messages', {
                    headers: { 'Authorization': AUTH_TOKEN }
                });
                
                if (messagesRes.ok) {
                    const messages = await messagesRes.json();
                    updateDashboardStats(currentContent, messages);
                    renderMessages(messages);
                } else {
                    console.warn('Mesajlar çekilemedi (Yetki eksik olabilir)');
                    updateDashboardStats(currentContent, []);
                    renderMessages([]);
                }
            } catch (msgError) {
                console.error('Mesaj çekme hatası:', msgError);
                updateDashboardStats(currentContent, []);
                renderMessages([]);
            }

        } catch (error) {
            console.error('Genel veri çekme hatası:', error);
        }
    };

    // --- DASHBOARD LOGIC ---
    const updateDashboardStats = (content, messages) => {
        if (!content || !content.portfolio) return;
        
        document.getElementById('stat-projects').textContent = content.portfolio.projects ? content.portfolio.projects.length : 0;
        document.getElementById('stat-skills').textContent = (content.skills && content.skills.skillList) ? content.skills.skillList.length : 0;
        
        // Mesajlar dizi değilse 0 göster
        const msgList = Array.isArray(messages) ? messages : [];
        document.getElementById('stat-messages').textContent = msgList.length;
        document.getElementById('stat-unread').textContent = msgList.filter(m => !m.read).length;
    };

    const renderMessages = (messages) => {
        const tbody = document.getElementById('messages-table-body');
        if (!tbody) return;

        if (!Array.isArray(messages) || messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Mesaj bulunamadı veya yetkiniz yok.</td></tr>';
            return;
        }
        tbody.innerHTML = messages.map(m => `
            <tr>
                <td>${m.date || '-'}</td>
                <td>${m.name}</td>
                <td>${m.subject}</td>
                <td>${m.message}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-msg-btn" data-id="${m.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).reverse().join('');

        document.querySelectorAll('.delete-msg-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm('Silmek istediğine emin misin?')) return;
                const id = e.currentTarget.dataset.id;
                await fetch(`/api/messages/${id}`, { method: 'DELETE', headers: { 'Authorization': AUTH_TOKEN } });
                fetchData();
            });
        });
    };

    // --- HELPER: Base64 Converter with Resize ---
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Resize logic (Max width 800px)
                    const MAX_WIDTH = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress & Return Base64
                    resolve(canvas.toDataURL('image/jpeg', 0.8)); // 0.8 quality JPEG
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const attachFileListener = (fileInputId, textInputId) => {
        const fileInput = document.getElementById(fileInputId);
        const textInput = document.getElementById(textInputId);
        if (fileInput && textInput) {
            fileInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    try {
                        const base64 = await convertFileToBase64(e.target.files[0]);
                        textInput.value = base64;
                    } catch (err) {
                        console.error('File conversion error:', err);
                        alert('Resim dönüştürülemedi.');
                    }
                }
            });
        }
    };

    // Attach listeners
    attachFileListener('heroImageFile', 'heroImage');
    attachFileListener('editCardImageFile', 'editCardImage');
    attachFileListener('editModalImageFile', 'editModalImage');

    // --- HERO & ABOUT EDITOR ---
    const populateHeroAbout = () => {
        document.getElementById('heroTitle').value = currentContent.hero.title || '';
        document.getElementById('heroSubtitle').value = currentContent.hero.subtitle || '';
        document.getElementById('heroImage').value = currentContent.hero.profileImage || '';

        document.getElementById('aboutTitle').value = currentContent.about.title || '';
        document.getElementById('aboutParagraphs').value = currentContent.about.paragraphs.join('\n');
    };

    document.getElementById('heroForm').addEventListener('submit', (e) => {
        e.preventDefault();
        currentContent.hero.title = document.getElementById('heroTitle').value;
        currentContent.hero.subtitle = document.getElementById('heroSubtitle').value;
        currentContent.hero.profileImage = document.getElementById('heroImage').value;
        saveContent();
    });

    document.getElementById('aboutForm').addEventListener('submit', (e) => {
        e.preventDefault();
        currentContent.about.title = document.getElementById('aboutTitle').value;
        currentContent.about.paragraphs = document.getElementById('aboutParagraphs').value.split('\n').filter(p => p.trim() !== '');
        saveContent();
    });

    // --- SKILLS EDITOR ---
    const renderSkillsTable = () => {
        document.getElementById('skillsTitle').value = currentContent.skills.title;
        const tbody = document.getElementById('skills-table-body');
        tbody.innerHTML = currentContent.skills.skillList.map((skill, index) => `
            <tr>
                <td><input type="text" class="form-control skill-name" value="${skill.name}"></td>
                <td><input type="number" class="form-control skill-value" value="${skill.value}"></td>
                <td><button class="btn btn-danger btn-sm" onclick="removeSkill(${index})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
    };

    window.addNewSkillRow = () => {
        currentContent.skills.skillList.push({ name: 'Yeni Yetenek', value: '50' });
        renderSkillsTable();
    };

    window.removeSkill = (index) => {
        currentContent.skills.skillList.splice(index, 1);
        renderSkillsTable();
    };

    document.getElementById('saveSkillsBtn').addEventListener('click', () => {
        currentContent.skills.title = document.getElementById('skillsTitle').value;
        const names = document.querySelectorAll('.skill-name');
        const values = document.querySelectorAll('.skill-value');
        const newList = [];
        names.forEach((nameInput, i) => {
            newList.push({ name: nameInput.value, value: values[i].value });
        });
        currentContent.skills.skillList = newList;
        saveContent();
    });

    // --- PORTFOLIO EDITOR ---
    const renderPortfolioTable = () => {
        document.getElementById('portfolioTitle').value = currentContent.portfolio.title;
        const tbody = document.getElementById('admin-projects-table');
        tbody.innerHTML = currentContent.portfolio.projects.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.cardTitle}</td>
                <td>${p.cardDescription.substring(0, 30)}...</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editProject(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProject(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    };

    document.getElementById('savePortfolioTitleBtn').addEventListener('click', () => {
        currentContent.portfolio.title = document.getElementById('portfolioTitle').value;
        saveContent();
    });

    window.resetProjectModal = () => {
        document.getElementById('adminProjectForm').reset();
        document.getElementById('editProjectId').value = '';
    };

    window.editProject = (id) => {
        const project = currentContent.portfolio.projects.find(p => p.id === id);
        if(!project) return;
        
        document.getElementById('editProjectId').value = project.id;
        document.getElementById('editCardTitle').value = project.cardTitle;
        document.getElementById('editCardDesc').value = project.cardDescription;
        document.getElementById('editCardImage').value = project.cardImage;
        document.getElementById('editModalTitle').value = project.modalTitle;
        document.getElementById('editModalDesc').value = project.modalDescription;
        document.getElementById('editModalImage').value = project.modalImage;

        const modal = new bootstrap.Modal(document.getElementById('adminProjectModal'));
        modal.show();
    };

    window.deleteProject = (id) => {
        if(!confirm('Projeyi silmek istediğine emin misin?')) return;
        currentContent.portfolio.projects = currentContent.portfolio.projects.filter(p => p.id !== id);
        saveContent();
    };

    document.getElementById('adminProjectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const idStr = document.getElementById('editProjectId').value;
        
        const newProject = {
            id: idStr ? parseInt(idStr) : (Math.max(...currentContent.portfolio.projects.map(p => p.id), 0) + 1),
            cardTitle: document.getElementById('editCardTitle').value,
            cardDescription: document.getElementById('editCardDesc').value,
            cardImage: document.getElementById('editCardImage').value,
            modalTitle: document.getElementById('editModalTitle').value,
            modalDescription: document.getElementById('editModalDesc').value,
            modalImage: document.getElementById('editModalImage').value
        };

        if (idStr) {
            // Edit existing
            const index = currentContent.portfolio.projects.findIndex(p => p.id === parseInt(idStr));
            currentContent.portfolio.projects[index] = newProject;
        } else {
            // Add new
            currentContent.portfolio.projects.push(newProject);
        }

        bootstrap.Modal.getInstance(document.getElementById('adminProjectModal')).hide();
        saveContent();
    });


    // --- CONTACTS EDITOR ---
    const renderContactsTable = () => {
        const tbody = document.getElementById('contacts-table-body');
        tbody.innerHTML = currentContent.contact.map((c, index) => `
            <tr>
                <td><input type="text" class="form-control contact-type" value="${c.type}" placeholder="örn: email, github"></td>
                <td><input type="text" class="form-control contact-title" value="${c.title}"></td>
                <td><input type="text" class="form-control contact-text" value="${c.text}"></td>
                <td><input type="text" class="form-control contact-href" value="${c.href || ''}"></td>
                <td><button class="btn btn-danger btn-sm" onclick="removeContact(${index})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
    };

    window.addNewContactRow = () => {
        currentContent.contact.push({ type: 'icon', title: 'Başlık', text: 'Metin', href: '' });
        renderContactsTable();
    };

    window.removeContact = (index) => {
        currentContent.contact.splice(index, 1);
        renderContactsTable();
    };

    document.getElementById('saveContactsBtn').addEventListener('click', () => {
        const types = document.querySelectorAll('.contact-type');
        const titles = document.querySelectorAll('.contact-title');
        const texts = document.querySelectorAll('.contact-text');
        const hrefs = document.querySelectorAll('.contact-href');
        const newList = [];

        types.forEach((type, i) => {
            newList.push({
                type: type.value,
                title: titles[i].value,
                text: texts[i].value,
                href: hrefs[i].value
            });
        });
        currentContent.contact = newList;
        saveContent();
    });

    // --- USER MANAGEMENT ---
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('newUsername').value;
            const password = document.getElementById('newPassword').value;
            const role = document.getElementById('newRole').value;

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': AUTH_TOKEN
                    },
                    body: JSON.stringify({ username, password, role })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Kullanıcı başarıyla oluşturuldu!');
                    addUserForm.reset();
                } else {
                    alert('Hata: ' + data.message);
                }
            } catch (error) {
                console.error('Error adding user:', error);
                alert('Bir hata oluştu.');
            }
        });
    }

    fetchData();
});
