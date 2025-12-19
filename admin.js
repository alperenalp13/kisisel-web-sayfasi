document.addEventListener('DOMContentLoaded', async () => {
    const userRole = localStorage.getItem('userRole');
    const authToken = localStorage.getItem('authToken'); // Get token from storage

    if (userRole !== 'admin' || !authToken) { // Check if token exists
        window.location.href = '/login';
        return;
    }

    const AUTH_TOKEN = authToken; // Use the dynamic token

    const statProjects = document.getElementById('stat-projects');
    const statSkills = document.getElementById('stat-skills');
    const statMessages = document.getElementById('stat-messages');
    const statUnread = document.getElementById('stat-unread');
    const messagesTableBody = document.getElementById('messages-table-body');
    const projectsTableBody = document.getElementById('projects-table-body');
    const logoutBtn = document.getElementById('logoutBtn');

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userRole');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    });

    const fetchData = async () => {
        try {
            // Fetch Content
            const contentRes = await fetch('/api/content');
            const content = await contentRes.json();

            // Fetch Messages
            const messagesRes = await fetch('/api/messages', {
                headers: { 'Authorization': AUTH_TOKEN }
            });
            const messages = await messagesRes.json();

            updateDashboard(content, messages);
        } catch (error) {
            console.error('Data fetch error:', error);
        }
    };

    const updateDashboard = (content, messages) => {
        // Update Stats
        statProjects.textContent = content.portfolio.projects.length;
        statSkills.textContent = content.skills.skillList.length;
        statMessages.textContent = messages.length;
        statUnread.textContent = messages.filter(m => !m.read).length;

        // Populate Projects Table
        projectsTableBody.innerHTML = content.portfolio.projects.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.cardTitle}</td>
                <td>${p.cardDescription.substring(0, 50)}...</td>
                <td>
                    <a href="/#portfolio" class="btn btn-sm btn-info text-white"><i class="fas fa-eye"></i></a>
                </td>
            </tr>
        `).join('');

        // Populate Messages Table
        if (messages.length === 0) {
            messagesTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Henüz mesaj yok.</td></tr>';
        } else {
            messagesTableBody.innerHTML = messages.map(m => `
                <tr class="${m.read ? '' : 'table-warning'}">
                    <td>${m.date || 'Belirtilmemiş'}</td>
                    <td>${m.name}</td>
                    <td>${m.subject}</td>
                    <td>${m.message}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-msg-btn" data-id="${m.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).reverse().join(''); // Show newest first

            // Attach delete listeners
            document.querySelectorAll('.delete-msg-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if (confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
                        await deleteMessage(id);
                    }
                });
            });
        }
    };

    const deleteMessage = async (id) => {
        try {
            const response = await fetch(`/api/messages/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': AUTH_TOKEN }
            });
            if (response.ok) {
                fetchData(); // Refresh data
            } else {
                alert('Mesaj silinemedi.');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Mesaj silinirken hata oluştu.');
        }
    };

    // User Management
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
