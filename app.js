/**
 * Main Application Script
 * Handles content rendering, state management, and admin interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    const ROOT = document.getElementById('root');
    const AUTH_TOKEN = 'secret-admin-token';
    
    // Application state
    let state = {};
    let isLoggedIn = false;
    let targetImage = null;

    /* -------------------------------------------------------------------------- */
    /*                               Core Rendering                               */
    /* -------------------------------------------------------------------------- */

    const render = (data) => {
        state = data;
        
        ROOT.innerHTML = `
            <div id="particles-js"></div>
            ${Navbar(data)}
            ${Hero(data.hero)}
            ${About(data.about)}
            ${Skills(data.skills)}
            ${Portfolio(data.portfolio)}
            ${Contact(data.contact)}
            ${Footer()}
        `;

        renderProjectModals(data.portfolio.projects);
        initParticles();

        if (isLoggedIn) {
            enableAdminMode();
        }
    };

    /* -------------------------------------------------------------------------- */
    /*                               Components                                   */
    /* -------------------------------------------------------------------------- */

    const Navbar = () => `
        <nav class="navbar navbar-expand-lg fixed-top">
            <div class="container">
                <a class="navbar-brand" href="#">MUHAMMET ALPEREN ALP</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon" style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 30 30\'%3e%3cpath stroke=\'rgba(255, 255, 255, 0.8)\' stroke-linecap=\'round\' stroke-miterlimit=\'10\' stroke-width=\'2\' d=\'M4 7h22M4 15h22M4 23h22\'%2f%3e%3c/svg%3e");"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item"><a class="nav-link" href="#about">Hakkımda</a></li>
                        <li class="nav-item"><a class="nav-link" href="#skills">Yetenekler</a></li>
                        <li class="nav-item"><a class="nav-link" href="#portfolio">Portfolyo</a></li>
                        <li class="nav-item"><a class="nav-link" href="#contact">İletişim</a></li>
                        <li class="nav-item" id="login-nav-item">
                            <a class="nav-link" href="/login">Giriş Yap</a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `;

    const Hero = (data) => `
        <header class="hero">
            <div class="container">
                <div class="row align-items-center justify-content-center">
                    <div class="col-md-6 text-center text-md-start">
                        <h1 id="dynamic-text">${data.title}</h1>
                        <p class="subtitle">${data.subtitle}</p>
                    </div>
                    <div class="col-md-6 text-center order-md-2">
                        <img src="${data.profileImage}" class="img-fluid profile-picture-hero" alt="Profile">
                    </div>
                </div>
            </div>
        </header>
    `;

    const About = (data) => `
        <section id="about" class="section">
            <div class="container glass-card">
                <h2 class="section-title">${data.title}</h2>
                <div class="row">
                    <div class="col-lg-10 mx-auto about-text">
                        ${data.paragraphs.map(p => `<p>${p}</p>`).join('')}
                    </div>
                </div>
            </div>
        </section>
    `;

    const Skills = (data) => {
        let content = '';
        data.skillList.forEach((skill, index) => {
            if (index % 2 === 0) content += '<div class="col-md-6">';
            content += `
                <div class="skill" data-skill-name="${skill.name}">
                    <h5>${skill.name}</h5>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: ${skill.value}%;"></div>
                    </div>
                </div>
            `;
            if (index % 2 !== 0 || index === data.skillList.length - 1) content += '</div>';
        });

        return `
            <section id="skills" class="section">
                <div class="container glass-card">
                    <h2 class="section-title">${data.title}</h2>
                    <div class="row">${content}</div>
                </div>
            </section>
        `;
    };

    const Portfolio = (data) => {
        const cards = data.projects.map(p => ProjectCard(p)).join('');
        return `
            <section id="portfolio" class="section">
                <div class="container glass-card">
                    <h2 class="section-title">${data.title}</h2>
                    <div class="row">${cards}</div>
                </div>
            </section>
        `;
    };

    const ProjectCard = ({ id, cardTitle, cardDescription, cardImage }) => `
        <div class="col-md-4 mb-4 portfolio-item" data-id="${id}">
            <div class="glass-card portfolio-card h-100 d-flex flex-column">
                <img src="${cardImage}" class="card-img-top">
                <div class="card-body text-center">
                    <h5 class="card-title">${cardTitle}</h5>
                    <p class="mt-3" style="color: var(--subtle-text-color);">${cardDescription}</p>
                </div>
                <div class="card-footer text-center mt-auto">
                    <a href="#" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#projectModal${id}">Detaylar</a>
                </div>
            </div>
        </div>
    `;

    const Contact = (items) => {
        const content = items.map((item, index) => ContactItem(item, index)).join('');
        return `
            <section id="contact" class="section">
                <div class="container">
                    <h2 class="section-title">İletişim</h2>
                    <div class="row text-center">${content}</div>
                </div>
            </section>
        `;
    };

    const ContactItem = (item, index) => {
        const icons = {
            email: 'fas fa-envelope',
            phone: 'fas fa-phone',
            instagram: 'fab fa-instagram',
            youtube: 'fab fa-youtube',
            linkedin: 'fab fa-linkedin-in',
            github: 'fab fa-github',
            default: 'fas fa-info-circle'
        };

        const iconClass = icons[item.type] || icons.default;
        
        let contentHtml;
        if (item.type === 'phone') {
            contentHtml = `<p style="color: var(--subtle-text-color);">${item.text}</p>`;
        } else {
            contentHtml = `<a href="${item.href}" ${item.type !== 'email' ? 'target="_blank"' : ''} style="color: var(--subtle-text-color);">${item.text}</a>`;
        }

        const adminControls = isLoggedIn ? `
            <div class="d-flex mt-auto">
                <button class="btn btn-info btn-sm mt-2 edit-contact-btn me-2" data-index="${index}" data-bs-toggle="modal" data-bs-target="#addContactModal">Düzenle</button>
                <button class="btn btn-danger btn-sm mt-2 delete-contact-btn" data-index="${index}">Sil</button>
            </div>
        ` : '';

        return `
            <div class="col-md-3 mb-4 contact-item" data-index="${index}">
                <div class="glass-card h-100 d-flex flex-column justify-content-between align-items-center p-3">
                    <i class="${iconClass} fa-3x mb-3" style="color: var(--primary-color);"></i>
                    <h5>${item.title}</h5>
                    ${contentHtml}
                    ${adminControls}
                </div>
            </div>
        `;
    };

    const Footer = () => `
        <footer>
            <div class="container">
                <p style="color: var(--subtle-text-color);">&copy; 2025 Muhammet Alperen Alp. Tüm hakları saklıdır.</p>
            </div>
        </footer>
    `;

    const renderProjectModals = (projects) => {
        // Cleanup existing modals
        document.querySelectorAll('.modal[id^="projectModal"]').forEach(m => m.remove());
        
        const modalsHTML = projects.map(p => `
            <div class="modal fade" id="projectModal${p.id}" tabindex="-1">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content glass-card">
                        <div class="modal-header">
                            <h5 class="modal-title">${p.modalTitle}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <img src="${p.modalImage}" class="img-fluid mb-4" alt="${p.modalTitle}">
                            <p>${p.modalDescription}</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    };

    /* -------------------------------------------------------------------------- */
    /*                               Logic & Handlers                             */
    /* -------------------------------------------------------------------------- */

    const fetchData = async () => {
        try {
            const response = await fetch('/api/content');
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();
            render(data);
        } catch (error) {
            console.error('Failed to load content:', error);
            ROOT.innerHTML = `<div class="container text-center mt-5"><h3 class="text-danger">Failed to load content</h3></div>`;
        }
    };

    const scrapeCurrentState = () => {
        // Deep copy state to avoid mutations during read
        const newState = JSON.parse(JSON.stringify(state));
        
        // Update Hero
        newState.hero.title = ROOT.querySelector('#dynamic-text').innerHTML;
        newState.hero.subtitle = ROOT.querySelector('.hero .subtitle').innerHTML;
        newState.hero.profileImage = ROOT.querySelector('.profile-picture-hero').src;

        // Update About
        newState.about.title = ROOT.querySelector('#about .section-title').innerHTML;
        newState.about.paragraphs = Array.from(ROOT.querySelectorAll('.about-text p')).map(p => p.innerHTML);

        // Update Skills
        newState.skills.title = ROOT.querySelector('#skills .section-title').innerHTML;
        newState.skills.skillList = Array.from(ROOT.querySelectorAll('.skill')).map(el => {
            const name = el.querySelector('h5').childNodes[0].textContent.trim();
            const valueDisplay = el.querySelector('.skill-value-display');
            const value = valueDisplay ? valueDisplay.textContent : el.querySelector('.progress-bar').style.width.replace('%','');
            return { name, value };
        });

        // Update Portfolio (Metadata mostly, content relies on modals not being editable directly in this simplified view)
        newState.portfolio.title = ROOT.querySelector('#portfolio .section-title').innerHTML;
        // Note: For a real app, we'd scrape the project cards/modals too, but relying on state for unedited parts is safer here.

        // Update Contact
        const contactContainer = ROOT.querySelector('#contact');
        newState.contact = Array.from(contactContainer.querySelectorAll('.contact-item')).map(itemEl => {
            const title = itemEl.querySelector('h5').innerHTML;
            const type = title.toLowerCase(); 
            let text = '', href = null;

            const linkEl = itemEl.querySelector('a');
            if (linkEl) {
                text = linkEl.innerHTML;
                href = linkEl.getAttribute('href');
            } else {
                const pEl = itemEl.querySelector('p');
                text = pEl ? pEl.innerHTML : '';
            }

            return { type, title, text, href };
        });

        return newState;
    };

    const saveChanges = async () => {
        if (checkGuestMode()) return;

        const data = scrapeCurrentState();
        try {
            const response = await fetch('/api/content', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': AUTH_TOKEN 
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error('Save failed');
            alert('Değişiklikler başarıyla kaydedildi.');
        } catch (error) {
            console.error(error);
            alert('Kayıt sırasında bir hata oluştu.');
        }
    };

    const checkGuestMode = () => {
        if (localStorage.getItem('userRole') === 'guest') {
            alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
            return true;
        }
        return false;
    };

    /* -------------------------------------------------------------------------- */
    /*                               Admin Features                               */
    /* -------------------------------------------------------------------------- */

    const enableAdminMode = () => {
        isLoggedIn = true;
        document.body.classList.add('admin-mode');

        // Update Navbar
        const loginNavItem = document.getElementById('login-nav-item');
        if (loginNavItem) {
            const link = loginNavItem.querySelector('a');
            link.classList.add('admin-mode-fixed-link');
            link.textContent = 'Yönetim Paneli';
            link.href = '#';
        }

        addAdminControls();
        makeContentEditable();
        setupImageUpload();
    };

    const addAdminControls = () => {
        const navList = document.querySelector('#navbarNav .navbar-nav');
        if (!document.getElementById('logout-btn-li')) {
            // Logout Button
            const logoutLi = document.createElement('li');
            logoutLi.id = 'logout-btn-li';
            logoutLi.className = 'nav-item ms-auto';
            logoutLi.innerHTML = '<a href="#" class="nav-link">Çıkış</a>';
            logoutLi.addEventListener('click', () => {
                localStorage.removeItem('userRole');
                localStorage.removeItem('authToken');
                window.location.reload();
            });

            // Save Button
            const saveLi = document.createElement('li');
            saveLi.id = 'save-btn-li';
            saveLi.className = 'nav-item';
            saveLi.innerHTML = '<a href="#" class="nav-link">Kaydet</a>';
            saveLi.addEventListener('click', (e) => {
                e.preventDefault();
                saveChanges();
            });

            navList.appendChild(logoutLi);
            navList.appendChild(saveLi);
        }

        // Add Portfolio Button
        const portfolioRow = ROOT.querySelector('#portfolio .row');
        if (portfolioRow && !portfolioRow.querySelector('#add-portfolio-btn-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.id = 'add-portfolio-btn-wrapper';
            wrapper.className = 'col-md-4 mb-4 d-flex align-items-center justify-content-center';
            wrapper.innerHTML = '<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addProjectModal">Yeni Proje Ekle (+)</button>';
            portfolioRow.appendChild(wrapper);
        }

        // Add Skill Button
        const skillsContainer = ROOT.querySelector('#skills .glass-card');
        if (skillsContainer && !skillsContainer.querySelector('#add-skill-btn')) {
            const btn = document.createElement('button');
            btn.id = 'add-skill-btn';
            btn.className = 'btn btn-primary mt-4';
            btn.textContent = 'Yeni Yetenek Ekle (+)';
            btn.addEventListener('click', () => {
                if (checkGuestMode()) return;
                state.skills.skillList.push({ name: 'Yeni Yetenek', value: '50' });
                render(state);
            });
            skillsContainer.appendChild(btn);
        }

        // Add Contact Button
        const contactContainer = ROOT.querySelector('#contact .container');
        if (contactContainer && !contactContainer.querySelector('#add-contact-btn')) {
            const btn = document.createElement('button');
            btn.id = 'add-contact-btn';
            btn.className = 'btn btn-primary mt-4';
            btn.textContent = 'Yeni İletişim Ekle (+)';
            btn.setAttribute('data-bs-toggle', 'modal');
            btn.setAttribute('data-bs-target', '#addContactModal');
            contactContainer.appendChild(btn);
        }

        attachDynamicListeners();
    };

    const makeContentEditable = () => {
        ROOT.querySelectorAll('h1, h2, h5, p, a').forEach(el => {
            if (!el.closest('nav') && !el.closest('.modal')) {
                el.setAttribute('contenteditable', 'true');
                el.style.border = '1px dashed var(--primary-color)';
                el.style.cursor = 'text';
            }
        });
    };

    const setupImageUpload = () => {
        // Hidden file input
        let fileInput = document.getElementById('image-upload-input');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'image-upload-input';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            fileInput.addEventListener('change', (e) => {
                if (targetImage && e.target.files[0]) {
                    if (checkGuestMode()) {
                        fileInput.value = '';
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (evt) => { targetImage.src = evt.target.result; };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        }

        // Add buttons to images
        ROOT.querySelectorAll('img').forEach(img => {
            if (!img.closest('nav') && !img.nextElementSibling?.classList.contains('change-image-btn')) {
                const btn = document.createElement('button');
                btn.textContent = 'Değiştir';
                btn.className = 'btn btn-secondary btn-sm d-block mt-2 change-image-btn';
                img.parentElement.appendChild(btn);
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (checkGuestMode()) return;
                    targetImage = img;
                    fileInput.click();
                });
            }
        });
    };

    const attachDynamicListeners = () => {
        // Portfolio Delete Buttons
        ROOT.querySelectorAll('.portfolio-item').forEach(card => {
            const footer = card.querySelector('.card-footer');
            if (footer && !footer.querySelector('.delete-btn')) {
                const btn = document.createElement('a');
                btn.href = '#';
                btn.className = 'btn btn-danger btn-sm delete-btn ms-2';
                btn.textContent = 'Sil';
                footer.appendChild(btn);
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (checkGuestMode()) return;
                    if (confirm('Bu projeyi silmek istediğinize emin misiniz?')) {
                        const id = parseInt(card.dataset.id);
                        state.portfolio.projects = state.portfolio.projects.filter(p => p.id !== id);
                        render(state);
                    }
                });
            }
        });

        // Skill Controls
        ROOT.querySelectorAll('.skill').forEach(skillEl => {
            const header = skillEl.querySelector('h5');
            if (header.querySelector('.skill-counter')) return;

            const progressBar = skillEl.querySelector('.progress-bar');
            let val = parseInt(progressBar.style.width.replace('%', ''));
            const skillName = skillEl.dataset.skillName;

            const controls = document.createElement('span');
            controls.className = 'skill-counter ms-3';
            
            const display = document.createElement('span');
            display.className = 'skill-value-display mx-2';
            display.textContent = val;

            const btnMinus = createSkillBtn('-', () => {
                if (checkGuestMode()) return;
                if (val > 0) { val--; updateSkill(display, progressBar, val); }
            });
            
            const btnPlus = createSkillBtn('+', () => {
                if (checkGuestMode()) return;
                if (val < 100) { val++; updateSkill(display, progressBar, val); }
            });

            const btnDel = document.createElement('a');
            btnDel.innerHTML = '&times;';
            btnDel.className = 'skill-delete-btn text-danger ms-2 text-decoration-none';
            btnDel.style.cursor = 'pointer';
            btnDel.addEventListener('click', (e) => {
                e.preventDefault();
                if (checkGuestMode()) return;
                if (confirm(`'${skillName}' silinsin mi?`)) {
                    state.skills.skillList = state.skills.skillList.filter(s => s.name !== skillName);
                    render(state);
                }
            });

            controls.append(btnMinus, display, btnPlus);
            header.append(controls, btnDel);
        });
        
        // Contact Edit Buttons
        ROOT.querySelectorAll('.edit-contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const idx = parseInt(e.target.dataset.index);
                const item = state.contact[idx];
                
                document.getElementById('newContactTitle').value = item.title;
                document.getElementById('newContactText').value = item.text;
                document.getElementById('newContactHref').value = item.href || '';
                
                const form = document.getElementById('addContactForm');
                form.dataset.editingIndex = idx;
                document.getElementById('addContactModalLabel').textContent = 'İletişim Bilgisini Düzenle';
                form.querySelector('button[type="submit"]').textContent = 'Değişiklikleri Kaydet';
            });
        });

        // Contact Delete Buttons
        ROOT.querySelectorAll('.delete-contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (checkGuestMode()) return;
                const idx = parseInt(e.target.dataset.index);
                if (confirm('Silmek istediğinize emin misiniz?')) {
                    state.contact.splice(idx, 1);
                    render(state);
                }
            });
        });
    };

    const createSkillBtn = (text, onClick) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-secondary btn-sm py-0 px-2';
        btn.textContent = text;
        btn.addEventListener('click', onClick);
        return btn;
    };

    const updateSkill = (display, bar, val) => {
        display.textContent = val;
        bar.style.width = `${val}%`;
    };

    /* -------------------------------------------------------------------------- */
    /*                               Modal Handlers                               */
    /* -------------------------------------------------------------------------- */

    // Project Form Submit
    document.getElementById('addProjectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (checkGuestMode()) return;

        const fileToDataURL = (file) => new Promise((resolve) => {
            if (!file) resolve('https://via.placeholder.com/800x600');
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });

        const cardImgFile = document.getElementById('newProjectCardImage').files[0];
        const modalImgFile = document.getElementById('newProjectImage').files[0];

        Promise.all([fileToDataURL(cardImgFile), fileToDataURL(modalImgFile)]).then(([cardBase64, modalBase64]) => {
            const newId = state.portfolio.projects.length > 0 ? Math.max(...state.portfolio.projects.map(p => p.id)) + 1 : 1;
            
            state.portfolio.projects.push({
                id: newId,
                cardTitle: document.getElementById('newProjectTitle').value,
                cardDescription: document.getElementById('newProjectCardDesc').value,
                cardImage: cardBase64,
                modalTitle: document.getElementById('newProjectTitle').value,
                modalDescription: document.getElementById('newProjectModalDesc').value,
                modalImage: modalBase64
            });

            render(state);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('addProjectModal')).hide();
            e.target.reset();
        });
    });

    // Contact Form Submit
    document.getElementById('addContactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (checkGuestMode()) return;

        const formData = {
            title: document.getElementById('newContactTitle').value,
            text: document.getElementById('newContactText').value,
            href: document.getElementById('newContactHref').value
        };

        const idx = e.target.dataset.editingIndex;
        if (idx !== undefined) {
            // Edit mode
            state.contact[parseInt(idx)] = {
                ...state.contact[parseInt(idx)],
                title: formData.title,
                type: formData.title.toLowerCase(), // basic type inference
                text: formData.text,
                href: formData.href
            };
            delete e.target.dataset.editingIndex;
        } else {
            // Add mode
            state.contact.push({
                type: formData.title.toLowerCase(),
                title: formData.title,
                text: formData.text,
                href: formData.href
            });
        }

        render(state);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('addContactModal')).hide();
        e.target.reset();
        
        // Reset modal state
        document.getElementById('addContactModalLabel').textContent = 'Yeni İletişim Ekle';
        e.target.querySelector('button[type="submit"]').textContent = 'İletişim Bilgisi Ekle';
    });


    /* -------------------------------------------------------------------------- */
    /*                               Initialization                               */
    /* -------------------------------------------------------------------------- */

    const initParticles = () => {
        if (window.particlesJS) {
            particlesJS("particles-js", {
                "particles": { "number": { "value": 60 }, "color": { "value": "#ffffff" }, "shape": { "type": "star" }, "opacity": { "value": 0.5, "random": true }, "size": { "value": 4, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.4 }, "move": { "enable": true, "speed": 1 } },
                "interactivity": { "events": { "onhover": { "enable": true, "mode": "repulse" }, "onclick": { "enable": true, "mode": "push" } } }
            });
        }
    };

    // Check Login Status
    const role = localStorage.getItem('userRole');
    if (role === 'admin' || role === 'guest') {
        isLoggedIn = true;
    }

    // Start App
    fetchData();
});
