document.addEventListener('DOMContentLoaded', () => {
    const ROOT = document.getElementById('root');
    // ADMIN credentials removed from client-side for security
    
    // Get token dynamically
    const getAuthToken = () => localStorage.getItem('authToken');

    let state = {}; // Holds the entire page content
    let loggedIn = false;
    let targetImage = null;

    // --- RENDER FUNCTIONS (Builds the page from scratch) ---
    const renderPage = (data) => {
        state = data; // Update state
        console.log('renderPage - Logged In:', loggedIn); // Debugging
        ROOT.innerHTML = `
            <div id="particles-js"></div>
            ${renderNavbar()}
            ${renderHero(data.hero)}
            ${renderAbout(data.about)}
            ${renderSkills(data.skills)}
            ${renderPortfolio(data.portfolio)}
            ${renderContact(data.contact)}
            ${renderFooter()}
        `;
        renderModals(data.portfolio.projects);
        initializeParticles();
        if (loggedIn) { // If already logged in, re-enable editing features
            enableEditing();
        }
    };

    const renderNavbar = () => `
        <nav class="navbar navbar-expand-lg fixed-top">
            <div class="container">
                <a class="navbar-brand" href="#">MUHAMMET ALPEREN ALP</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon" style="background-image: url('data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 30 30\'%3e%3cpath stroke=\'rgba(255, 255, 255, 0.8)\' stroke-linecap=\'round\' stroke-miterlimit=\'10\' stroke-width=\'2\' d=\'M4 7h22M4 15h22M4 23h22\'%2f%3e%3c/svg%3e');"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item"><a class="nav-link" href="#about">Hakkımda</a></li>
                        <li class="nav-item"><a class="nav-link" href="#skills">Yetenekler</a></li>
                        <li class="nav-item"><a class="nav-link" href="#portfolio">Portfolyo</a></li>
                        <li class="nav-item"><a class="nav-link" href="#contact">İletişim</a></li>
                        <li class="nav-item" id="login-nav-item"><a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">Giriş Yap</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    `;

    const renderHero = (hero) => {
        console.log('Hero Profile Image:', hero.profileImage);
        return `
            <header class="hero">
                <div class="container">
                    <div class="row align-items-center justify-content-center">
                        <div class="col-md-6 text-center text-md-start">
                            <h1 id="dynamic-text">${hero.title}</h1>
                            <p class="subtitle">${hero.subtitle}</p>
                        </div>
                        <div class="col-md-6 text-center order-md-2">
                            <img src="${hero.profileImage}" class="img-fluid profile-picture-hero" alt="Muhammet Alperen Alp">
                        </div>
                    </div>
                </div>
            </header>
        `;
    };

    const renderAbout = (about) => `
        <section id="about" class="section">
            <div class="container glass-card">
                <h2 class="section-title">${about.title}</h2>
                <div class="row"><div class="col-lg-10 mx-auto about-text">${about.paragraphs.map(p => `<p>${p}</p>`).join('')}</div></div>
            </div>
        </section>
    `;

    const renderSkills = (skills) => {
        let skillHTML = '';
        skills.skillList.forEach((skill, index) => {
            if (index % 2 === 0) skillHTML += '<div class="col-md-6">';
            skillHTML += `
                <div class="skill" data-skill-name="${skill.name}">
                    <h5>${skill.name}</h5>
                    <div class="progress"><div class="progress-bar" role="progressbar" style="width: ${skill.value}%;"></div></div>
                </div>
            `;
            if (index % 2 !== 0 || index === skills.skillList.length - 1) skillHTML += '</div>';
        });
        return `
            <section id="skills" class="section">
                <div class="container glass-card">
                    <h2 class="section-title">${skills.title}</h2>
                    <div class="row">${skillHTML}</div>
                </div>
            </section>
        `;
    };

    const renderPortfolio = (portfolio) => {
        const cardsHTML = portfolio.projects.map(p => getNewCardHTML(p.id, p.cardTitle, p.cardDescription, p.cardImage)).join('');
        return `
            <section id="portfolio" class="section">
                <div class="container glass-card">
                    <h2 class="section-title">${portfolio.title}</h2>
                    <div class="row">${cardsHTML}</div>
                </div>
            </section>
        `;
    };
    
    const renderModals = (projects) => {
        document.querySelectorAll('.modal[id^="projectModal"]').forEach(m => m.remove());
        const modalsHTML = projects.map(p => getNewModalHTML(p.id, p.modalTitle, p.modalImage, p.modalDescription)).join('');
        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    };

    const addNewContactItem = (data) => {
        state.contact.push({
            type: data.title.toLowerCase(), // Use title as type for icon mapping
            title: data.title,
            text: data.text,
            href: data.href
        });
        renderPage(state);
        enableEditing();
    };

    const deleteContactItem = (index) => {
        state.contact.splice(index, 1);
        renderPage(state);
        enableEditing();
    };

    const editContactItem = (index, data) => {
        state.contact[index] = {
            type: data.title.toLowerCase(),
            title: data.title,
            text: data.text,
            href: data.href
        };
        renderPage(state);
        enableEditing();
    };
    const renderContact = (contactItems) => {
        const contactHtml = contactItems.map((item, index) => {
            let iconClass = '';
            let contentHtml = '';
            let hrefAttr = '';

            switch (item.type) {
                case 'email':
                    iconClass = 'fas fa-envelope';
                    contentHtml = `<a href="${item.href}" style="color: var(--subtle-text-color);">${item.text}</a>`;
                    hrefAttr = `href="${item.href}"`;
                    break;
                case 'phone':
                    iconClass = 'fas fa-phone';
                    contentHtml = `<p style="color: var(--subtle-text-color);">${item.text}</p>`;
                    break;
                case 'instagram':
                    iconClass = 'fab fa-instagram';
                    contentHtml = `<a href="${item.href}" target="_blank" style="color: var(--subtle-text-color);">${item.text}</a>`;
                    hrefAttr = `href="${item.href}"`;
                    break;
                case 'youtube':
                    iconClass = 'fab fa-youtube';
                    contentHtml = `<a href="${item.href}" target="_blank" style="color: var(--subtle-text-color);">${item.text}</a>`;
                    hrefAttr = `href="${item.href}"`;
                    break;
                case 'linkedin':
                    iconClass = 'fab fa-linkedin-in';
                    contentHtml = `<a href="${item.href}" target="_blank" style="color: var(--subtle-text-color);">${item.text}</a>`;
                    hrefAttr = `href="${item.href}"`;
                    break;
                case 'github':
                    iconClass = 'fab fa-github';
                    contentHtml = `<a href="${item.href}" target="_blank" style="color: var(--subtle-text-color);">${item.text}</a>`;
                    hrefAttr = `href="${item.href}"`;
                    break;
                default:
                    iconClass = 'fas fa-info-circle'; // Default icon for unknown types
                    contentHtml = `<p style="color: var(--subtle-text-color);">${item.text}</p>`;
            }

            const editButton = loggedIn ? `<button class="btn btn-info btn-sm mt-2 edit-contact-btn me-2" data-index="${index}" data-bs-toggle="modal" data-bs-target="#addContactModal">Düzenle</button>` : '';
            const deleteButton = loggedIn ? `<button class="btn btn-danger btn-sm mt-2 delete-contact-btn" data-index="${index}">Sil</button>` : '';

            return `
                <div class="col-md-3 mb-4 contact-item" data-index="${index}">
                    <div class="glass-card h-100 d-flex flex-column justify-content-between align-items-center p-3">
                        <i class="${iconClass} fa-3x mb-3" style="color: var(--primary-color);"></i>
                        <h5>${item.title}</h5>
                        ${contentHtml}
                        <div class="d-flex mt-auto">
                            ${editButton}
                            ${deleteButton}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <section id="contact" class="section">
                <div class="container">
                    <h2 class="section-title">İletişim</h2>
                    <div class="row text-center mb-5">
                        ${contactHtml}
                    </div>
                    <div class="row justify-content-center">
                        <div class="col-lg-8">
                            <div class="glass-card">
                                <h3 class="text-center mb-4">Görüş ve Önerileriniz</h3>
                                <div id="contact-success-message" class="alert alert-success d-none text-center" role="alert">Mesajınız iletilmiştir.</div>
                                <form id="contactForm">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="contactName" class="form-label" style="color: var(--primary-color);">Ad Soyad</label>
                                            <input type="text" class="form-control" id="contactName" required style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white;">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label for="contactEmail" class="form-label" style="color: var(--primary-color);">Email</label>
                                            <input type="email" class="form-control" id="contactEmail" required style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white;">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="contactSubject" class="form-label" style="color: var(--primary-color);">Konu</label>
                                        <input type="text" class="form-control" id="contactSubject" required style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white;">
                                    </div>
                                    <div class="mb-3">
                                        <label for="contactMessage" class="form-label" style="color: var(--primary-color);">Mesaj</label>
                                        <textarea class="form-control" id="contactMessage" rows="5" required style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white;"></textarea>
                                    </div>
                                    <div class="text-center">
                                        <button type="submit" class="btn btn-primary">Mesajı Gönder</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    };

    const renderFooter = () => `<footer><div class="container"><p style="color: var(--subtle-text-color);">&copy; 2025 Muhammet Alperen Alp. Tüm hakları saklıdır.</p></div></footer>`;

    // --- DATA HANDLING ---
    const loadContentFromServer = async () => {
        try {
            const response = await fetch('/api/content');
            if (!response.ok) throw new Error(`Server error!`);
            const data = await response.json();
            renderPage(data);
        } catch (error) {
            ROOT.innerHTML = `<div class="container text-center mt-5"><h1 class="text-danger">Sayfa Yüklenemedi</h1><p>Lütfen sunucunun çalıştığından emin olun: <code>node server.js</code></p></div>`;
        }
    };

    const scrapePageData = () => {
        const new_state = JSON.parse(JSON.stringify(state));
        new_state.hero.title = ROOT.querySelector('#dynamic-text').innerHTML;
        new_state.hero.subtitle = ROOT.querySelector('.hero .subtitle').innerHTML;
        new_state.hero.profileImage = ROOT.querySelector('.profile-picture-hero').src;
        new_state.about.title = ROOT.querySelector('#about .section-title').innerHTML;
        new_state.about.paragraphs = Array.from(ROOT.querySelectorAll('.about-text p')).map(p => p.innerHTML);
        new_state.skills.title = ROOT.querySelector('#skills .section-title').innerHTML;
        new_state.skills.skillList = Array.from(ROOT.querySelectorAll('.skill')).map(el => {
            const name = el.querySelector('h5').childNodes[0].textContent.trim();
            const valueDisplay = el.querySelector('.skill-value-display');
            const value = valueDisplay ? valueDisplay.textContent : el.querySelector('.progress-bar').style.width.replace('%','');
            return { name, value };
        });
        new_state.portfolio.title = ROOT.querySelector('#portfolio .section-title').innerHTML;
        new_state.portfolio.projects = Array.from(ROOT.querySelectorAll('.portfolio-item')).map(card => {
            const id = card.dataset.id;
            const modal = document.getElementById(`projectModal${id}`);
            return {
                id: parseInt(id),
                cardTitle: card.querySelector('.card-title').innerHTML,
                cardDescription: card.querySelector('.card-body > p').innerHTML,
                cardImage: card.querySelector('.card-img-top').src,
                modalTitle: modal.querySelector('.modal-title').innerHTML,
                modalImage: modal.querySelector('.modal-body img').src,
                modalDescription: modal.querySelector('.modal-body p').innerHTML
            };
        });
        const contactContainer = ROOT.querySelector('#contact');
        new_state.contact = Array.from(contactContainer.querySelectorAll('.contact-item')).map(itemEl => {
            const title = itemEl.querySelector('h5').innerHTML;
            const type = title.toLowerCase(); // Assuming title can be used as type
            let text = '';
            let href = null;

            const linkEl = itemEl.querySelector('a');
            if (linkEl) {
                text = linkEl.innerHTML;
                href = linkEl.getAttribute('href');
            } else {
                text = itemEl.querySelector('p') ? itemEl.querySelector('p').innerHTML : '';
            }

            return { type, title, text, href };
        });
        return new_state;
    };

    const saveContentToServer = async () => {
        const data = scrapePageData();
        try {
            const response = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': getAuthToken() },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`Server error!`);
            alert('Değişiklikler başarıyla kaydedildi!');
            return true;
        } catch (error) {
            alert('Değişiklikler kaydedilemedi!');
            return false;
        }
    };

    // --- EDITING UI ---
    const enableEditing = () => {
        loggedIn = true;
        console.log('enableEditing - Logged In:', loggedIn); // Debugging
        
        const loginNavItem = document.getElementById('login-nav-item');
        if(loginNavItem) {
            loginNavItem.querySelector('a').classList.add('admin-mode-fixed-link');
            loginNavItem.querySelector('a').textContent = 'Yönetim Paneli';
            loginNavItem.querySelector('a').href = '/admin'; 
            loginNavItem.style.display = 'list-item'; 
            
            // Prevent duplicate buttons
            if (!document.getElementById('logout-btn-li')) {
                // Sıralama: Yönetim Paneli - Kaydet - Çıkış
                loginNavItem.insertAdjacentHTML('afterend', '<li class="nav-item" id="save-btn-li"><a href="#" class="nav-link">Kaydet</a></li><li class="nav-item" id="logout-btn-li"><a href="#" class="nav-link">Çıkış</a></li>');
                
                document.getElementById('logout-btn-li').addEventListener('click', () => {
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('authToken');
                    window.location.reload();
                });

                document.getElementById('save-btn-li').addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (localStorage.getItem('userRole') === 'guest') {
                         alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
                         return;
                    }
                    await saveContentToServer();
                    disableEditing();
                    window.location.reload();
                });
            }
        }


        const editable_selectors = 'h1, h2, h5, p, a';
        ROOT.querySelectorAll(editable_selectors).forEach(el => {
            if (!el.closest('nav')) {
                el.setAttribute('contenteditable', 'true');
                el.style.border = '1px dashed var(--primary-color)';
                el.style.cursor = 'text';
            }
        });

        ROOT.querySelectorAll('img').forEach(img => {
            if (!img.closest('nav')) {
                // Check if button already exists to prevent duplicates
                if (img.nextElementSibling && img.nextElementSibling.classList.contains('change-image-btn')) return;

                const changeButton = document.createElement('button');
                changeButton.textContent = 'Değiştir';
                changeButton.className = 'btn btn-secondary btn-sm d-block mt-2 change-image-btn';
                img.parentElement.appendChild(changeButton);
                changeButton.addEventListener('click', (e) => { 
                    e.preventDefault(); 
                    if (localStorage.getItem('userRole') === 'guest') {
                         alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
                         return;
                    }
                    targetImage = img; 
                    document.getElementById('image-upload-input').click(); 
                });
            }
        });

        const portfolioRow = ROOT.querySelector('#portfolio .row');
        if (portfolioRow && !portfolioRow.querySelector('#add-portfolio-btn-wrapper')) {
            const addButtonWrapper = document.createElement('div');
            addButtonWrapper.id = 'add-portfolio-btn-wrapper';
            addButtonWrapper.className = 'col-md-4 mb-4 d-flex align-items-center justify-content-center';
            addButtonWrapper.innerHTML = `<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addProjectModal">Yeni Proje Ekle (+)</button>`;
            portfolioRow.appendChild(addButtonWrapper);
        }

        ROOT.querySelectorAll('.portfolio-item').forEach(card => {
            const cardId = card.dataset.id;
            const footer = card.querySelector('.card-footer');
            if (footer && !footer.querySelector('.delete-btn')) {
                const deleteButton = document.createElement('a');
                deleteButton.href = '#';
                deleteButton.className = 'btn btn-danger btn-sm delete-btn ms-2';
                deleteButton.textContent = 'Sil';
                footer.appendChild(deleteButton);
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (localStorage.getItem('userRole') === 'guest') {
                         alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
                         return;
                    }
                    if (confirm(`Bu projeyi silmek istediğinizden emin misiniz?`)) {
                        deletePortfolioItem(parseInt(cardId));
                    }
                });
            }
        });

        ROOT.querySelectorAll('.skill').forEach(skillEl => {
            // ... (Skill counter creation logic kept same, but check duplicates if needed)
            const skillName = skillEl.dataset.skillName;
            const skillNameEl = skillEl.querySelector('h5');
            const progressBar = skillEl.querySelector('.progress-bar');
            
            if(skillNameEl.querySelector('.skill-counter')) return; // Already initialized

            let currentValue = parseInt(progressBar.style.width.replace('%', ''));

            const counterWrapper = document.createElement('span');
            counterWrapper.className = 'skill-counter';
            counterWrapper.style.marginLeft = '15px';

            const minusBtn = document.createElement('button');
            minusBtn.className = 'btn btn-outline-secondary btn-sm py-0 px-2';
            minusBtn.textContent = '-';

            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'skill-value-display';
            valueDisplay.textContent = currentValue;
            valueDisplay.style.margin = '0 10px';

            const plusBtn = document.createElement('button');
            plusBtn.className = 'btn btn-outline-secondary btn-sm py-0 px-2';
            plusBtn.textContent = '+';

            counterWrapper.appendChild(minusBtn);
            counterWrapper.appendChild(valueDisplay);
            counterWrapper.appendChild(plusBtn);
            skillNameEl.appendChild(counterWrapper);

            plusBtn.addEventListener('click', () => {
                if (localStorage.getItem('userRole') === 'guest') { alert('Yetkiniz yok (Misafir).'); return; }
                if (currentValue < 100) {
                    currentValue++;
                    valueDisplay.textContent = currentValue;
                    progressBar.style.width = `${currentValue}%`;
                }
            });

            minusBtn.addEventListener('click', () => {
                 if (localStorage.getItem('userRole') === 'guest') { alert('Yetkiniz yok (Misafir).'); return; }
                if (currentValue > 0) {
                    currentValue--;
                    valueDisplay.textContent = currentValue;
                    progressBar.style.width = `${currentValue}%`;
                }
            });

            const deleteBtn = document.createElement('a');
            deleteBtn.href = '#';
            deleteBtn.innerHTML = ' &times;';
            deleteBtn.className = 'skill-delete-btn';
            deleteBtn.style.color = 'red';
            deleteBtn.style.textDecoration = 'none';
            deleteBtn.style.marginLeft = '10px';
            skillNameEl.appendChild(deleteBtn);
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (localStorage.getItem('userRole') === 'guest') {
                     alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
                     return;
                }
                if (confirm(`'${skillName}' yeteneğini silmek istediğinizden emin misiniz?`)) {
                    deleteSkill(skillName);
                }
            });
        });

        const skillsContainer = ROOT.querySelector('#skills .glass-card');
        if (skillsContainer && !skillsContainer.querySelector('#add-skill-btn')) {
            const addSkillBtn = document.createElement('button');
            addSkillBtn.id = 'add-skill-btn';
            addSkillBtn.className = 'btn btn-primary mt-4';
            addSkillBtn.textContent = 'Yeni Yetenek Ekle (+)';
            skillsContainer.appendChild(addSkillBtn);
            addSkillBtn.addEventListener('click', () => {
                 if (localStorage.getItem('userRole') === 'guest') {
                     alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
                     return;
                 }
                addNewSkill();
            });
        }

        ROOT.querySelectorAll('.contact-item').forEach(contactItem => {
            const deleteButton = contactItem.querySelector('.delete-contact-btn');
            if (deleteButton) {
                // Remove old listeners to avoid stacking (tricky without named functions, but check logic covers it)
                // Actually in renderContact we create new buttons each time so listeners are fresh.
                // But if enableEditing called on existing DOM, we attach listeners to existing buttons.
                // Better to use event delegation or check if listener attached?
                // For now, assume renderPage refreshes DOM or enableEditing adds buttons only if missing.
                // In renderContact, buttons are added if loggedIn is true. Here we add them dynamically?
                // Wait, renderContact adds buttons based on 'loggedIn' state.
                // If enableEditing is called, loggedIn is true.
                // But we need to attach listeners if they are not attached.
                
                // Let's rely on the fact that we are attaching to the button element itself.
                // If the button was just created by renderContact (loggedIn=true), it has no listener yet?
                // No, renderContact creates HTML string. Listener must be attached after render.
                
                // The current structure: renderContact returns HTML string. 
                // enableEditing attaches listeners.
                // So we are good.
                
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (localStorage.getItem('userRole') === 'guest') {
                         alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
                         return;
                    }
                    const index = parseInt(e.target.dataset.index);
                    if (confirm(`Bu iletişim bilgisini silmek istediğinizden emin misiniz?`)) {
                        deleteContactItem(index);
                    }
                });
            }
        });

        const contactSection = ROOT.querySelector('#contact .container');
        if (contactSection && !contactSection.querySelector('#add-contact-btn')) {
            const addContactBtn = document.createElement('button');
            addContactBtn.id = 'add-contact-btn';
            addContactBtn.className = 'btn btn-primary mt-4';
            addContactBtn.textContent = 'Yeni İletişim Ekle (+)';
            addContactBtn.setAttribute('data-bs-toggle', 'modal');
            addContactBtn.setAttribute('data-bs-target', '#addContactModal');
            contactSection.appendChild(addContactBtn);
        }

        ROOT.querySelectorAll('.edit-contact-btn').forEach(editButton => {
            editButton.addEventListener('click', (e) => {
                e.preventDefault();
                // Guest check happens on Save, but maybe also prevent opening modal?
                // User said "same view", so maybe opening modal is fine, just saving is blocked.
                // But to be safe/annoying:
                /* 
                if (localStorage.getItem('userRole') === 'guest') {
                     // alert('...'); 
                     // allow viewing 
                }
                */
               
                const index = parseInt(e.target.dataset.index);
                const contactItem = state.contact[index];

                document.getElementById('newContactTitle').value = contactItem.title;
                document.getElementById('newContactText').value = contactItem.text;
                document.getElementById('newContactHref').value = contactItem.href || '';
                document.getElementById('addContactForm').dataset.editingIndex = index;
                document.getElementById('addContactModalLabel').textContent = 'İletişim Bilgisini Düzenle';
                document.querySelector('#addContactForm button[type="submit"]').textContent = 'Değişiklikleri Kaydet';
            });
        });
    };

    const disableEditing = () => {
        loggedIn = false;
        
        const loginNavItem = document.getElementById('login-nav-item');
        if (loginNavItem) {
            loginNavItem.style.display = 'list-item'; // Ensure it's visible
            loginNavItem.querySelector('a').classList.remove('admin-mode-fixed-link');
            loginNavItem.querySelector('a').textContent = 'Giriş Yap';
            loginNavItem.querySelector('a').href = '/login'; // Point back to login page
        }

        document.getElementById('save-btn-li')?.remove();
        document.getElementById('logout-btn-li')?.remove();
        ROOT.querySelectorAll('[contenteditable="true"]').forEach(el => { el.setAttribute('contenteditable', 'false'); el.style.border = 'none'; });
        ROOT.querySelectorAll('.change-image-btn').forEach(btn => btn.remove());
        ROOT.querySelector('#add-portfolio-btn-wrapper')?.remove();
        ROOT.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
        ROOT.querySelector('#add-skill-btn')?.remove();
        ROOT.querySelectorAll('.skill-counter').forEach(el => el.remove());
        ROOT.querySelectorAll('.skill-delete-btn').forEach(el => el.remove());
        ROOT.querySelectorAll('.delete-contact-btn').forEach(btn => btn.remove());
        ROOT.querySelector('#add-contact-btn')?.remove(); // Remove the add contact button
    };
    const deletePortfolioItem = (id) => {
        state.portfolio.projects = state.portfolio.projects.filter(p => p.id !== id);
        renderPage(state);
        enableEditing();
    };

    const addNewSkill = () => {
        state.skills.skillList.push({ name: 'Yeni Yetenek', value: '50' });
        renderPage(state);
        enableEditing();
    };

    const deleteSkill = (skillName) => {
        state.skills.skillList = state.skills.skillList.filter(s => s.name !== skillName);
        renderPage(state);
        enableEditing();
    };

    const addNewPortfolioItem = (data) => {
        const newId = state.portfolio.projects.length > 0 ? Math.max(...state.portfolio.projects.map(p => p.id)) + 1 : 1;
        const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
            if (!file) return resolve('https://via.placeholder.com/800x600');
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        Promise.all([readFileAsDataURL(data.cardImage), readFileAsDataURL(data.modalImage)])
            .then(([cardImageBase64, modalImageBase64]) => {
                const newProject = {
                    id: newId,
                    cardTitle: data.title,
                    cardDescription: data.cardDesc,
                    cardImage: cardImageBase64,
                    modalTitle: data.title,
                    modalImage: modalImageBase64,
                    modalDescription: data.modalDesc
                };
                state.portfolio.projects.push(newProject);
                renderPage(state);
                enableEditing();
                ROOT.querySelector(`[data-id="${newId}"]`)?.scrollIntoView({ behavior: 'smooth' });
            })
            .catch(error => {
                console.error("Error reading files:", error);
                alert("Resimler okunurken bir hata oluştu.");
            });
    };

    // --- TEMPLATES ---
    const getNewCardHTML = (id, title, description, cardImage) => {
        console.log('Card Image:', cardImage);
        return `<div class="col-md-4 mb-4 portfolio-item" data-id="${id}"><div class="glass-card portfolio-card h-100 d-flex flex-column"><img src="${cardImage}" class="card-img-top"><div class="card-body text-center"><h5 class="card-title">${title}</h5><p class="mt-3" style="color: var(--subtle-text-color);">${description}</p></div><div class="card-footer text-center mt-auto"><a href="#" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#projectModal${id}">Detaylar</a></div></div></div>`;
    };
    const getNewModalHTML = (id, title, image, description) => {
        console.log('Modal Image:', image);
        return `<div class="modal fade" id="projectModal${id}" tabindex="-1"><div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content glass-card"><div class="modal-header"><h5 class="modal-title">${title}</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body"><img src="${image}" class="img-fluid mb-4" alt="${title}"><p>${description}</p></div></div></div></div>`;
    };

    // --- INITIALIZATION ---
    // Check for existing session from login.html
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin' || userRole === 'guest') {
        loggedIn = true;
        // Wait for initial render to complete before enabling editing
        setTimeout(() => {
            if (document.querySelector('#navbarNav')) {
                 enableEditing();
            }
        }, 500); // Small delay to ensure DOM is ready
    }

    // Redirect "Giriş Yap" to login page
    const loginLink = document.querySelector('a[data-bs-target="#loginModal"]');
    if (loginLink) {
        loginLink.removeAttribute('data-bs-toggle');
        loginLink.removeAttribute('data-bs-target');
        loginLink.href = '/login';
    }
    // Also handle dynamic re-renders
    const observer = new MutationObserver(() => {
        const link = document.querySelector('a[data-bs-target="#loginModal"]');
        if (link) {
            link.removeAttribute('data-bs-toggle');
            link.removeAttribute('data-bs-target');
            link.href = '/login';
        }
    });
    observer.observe(ROOT, { childList: true, subtree: true });


    /* Removed old loginForm listener as we use login.html now */
    /*
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('loginUsername').value === ADMIN_USERNAME && document.getElementById('loginPassword').value === ADMIN_PASSWORD) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).hide();
            loggedIn = true; // Set loggedIn to true before re-rendering
            renderPage(state); // Re-render the page with admin features
        } else {
            alert('Kullanıcı adı veya şifre hatalı.');
        }
    });
    */

    document.getElementById('addProjectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (localStorage.getItem('userRole') === 'guest') {
             alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
             return;
        }
        const data = {
            title: document.getElementById('newProjectTitle').value,
            cardDesc: document.getElementById('newProjectCardDesc').value,
            modalDesc: document.getElementById('newProjectModalDesc').value,
            cardImage: document.getElementById('newProjectCardImage').files[0],
            modalImage: document.getElementById('newProjectImage').files[0]
        };
        addNewPortfolioItem(data);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('addProjectModal')).hide();
        e.target.reset();
    });

    document.getElementById('addContactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (localStorage.getItem('userRole') === 'guest') {
             alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
             return;
        }
        const data = {
            title: document.getElementById('newContactTitle').value,
            text: document.getElementById('newContactText').value,
            href: document.getElementById('newContactHref').value
        };

        const editingIndex = e.target.dataset.editingIndex;
        if (editingIndex !== undefined) {
            editContactItem(parseInt(editingIndex), data);
            delete e.target.dataset.editingIndex; // Clear editing state
        } else {
            addNewContactItem(data);
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('addContactModal')).hide();
        e.target.reset();
        // Reset modal title and button text to "Add" state
        document.getElementById('addContactModalLabel').textContent = 'Yeni İletişim Ekle';
        document.querySelector('#addContactForm button[type="submit"]').textContent = 'İletişim Bilgisi Ekle';
    });

    // Event delegation for dynamically rendered contact form
    ROOT.addEventListener('submit', async (e) => {
        if (e.target && e.target.id === 'contactForm') {
            e.preventDefault();
            const formData = {
                name: document.getElementById('contactName').value,
                email: document.getElementById('contactEmail').value,
                subject: document.getElementById('contactSubject').value,
                message: document.getElementById('contactMessage').value,
                date: new Date().toLocaleString('tr-TR')
            };

            try {
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    const msgDiv = document.getElementById('contact-success-message');
                    if(msgDiv) {
                        msgDiv.classList.remove('d-none');
                        setTimeout(() => msgDiv.classList.add('d-none'), 3000);
                    }
                    e.target.reset();
                } else {
                    throw new Error('Mesaj gönderilemedi.');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Mesaj gönderilirken bir hata oluştu.');
            }
        }
    });

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'image-upload-input';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', (event) => {
        if (targetImage && event.target.files && event.target.files[0]) {
             if (localStorage.getItem('userRole') === 'guest') {
                 alert('Bu işlem için yetkiniz bulunmamaktadır (Misafir Modu).');
                 fileInput.value = ''; // Reset
                 return;
            }
            const reader = new FileReader();
            reader.onload = (e) => { targetImage.src = e.target.result; };
            reader.readAsDataURL(event.target.files[0]);
        }
    });
    
    const initializeParticles = () => {
        if(window.particlesJS) {
            particlesJS("particles-js", {
                "particles": { "number": { "value": 60 }, "color": { "value": "#ffffff" }, "shape": { "type": "star" }, "opacity": { "value": 0.5, "random": true }, "size": { "value": 4, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.4 }, "move": { "enable": true, "speed": 1 } },
                "interactivity": { "events": { "onhover": { "enable": true, "mode": "repulse" }, "onclick": { "enable": true, "mode": "push" } } }
            });
        }
    };

    loadContentFromServer();
});