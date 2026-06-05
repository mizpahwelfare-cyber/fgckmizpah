// ============ AUTHENTICATION & PERMISSION SYSTEM ============
let currentUser = null;

const STAFF_CREDENTIALS = {
  pastor: '72a8403b0b45e2c73f4a19942f191def3d728e2345fdf1e291de2412e2736813',
  elder: '01ce0fac71149c483337c57746f56eef28d1b7c390e7b170bc018c45d5a80513'
};

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const PERMISSIONS = {
  pastor: {
    canViewMembers: true,
    canAddMembers: true,
    canEditMembers: true,
    canViewTithe: true,
    canRecordTithe: true,
    canViewChurchGiving: true,
    canRecordChurchGiving: true,
    canViewWelfare: true,
    canRecordWelfare: true,
    canViewInventory: true,
    canRecordInventory: true,
    canViewAttendance: true,
    canRecordAttendance: true,
    canViewExpenses: true,
    canRecordExpenses: true,
    canViewDepartment: true,
    canRecordDepartment: true,
    canViewProjectGiving: true,
    canRecordProjectGiving: true,
    canBackupData: true,
    canViewAllData: true,
  },
  elder: {
    canViewMembers: true,
    canAddMembers: false,
    canEditMembers: false,
    canViewTithe: false,
    canRecordTithe: false,
    canViewChurchGiving: true,
    canRecordChurchGiving: true,
    canViewWelfare: true,
    canRecordWelfare: true,
    canViewInventory: true,
    canRecordInventory: true,
    canViewAttendance: true,
    canRecordAttendance: true,
    canViewExpenses: true,
    canRecordExpenses: true,
    canViewDepartment: true,
    canRecordDepartment: false,
    canViewProjectGiving: true,
    canRecordProjectGiving: false,
    canBackupData: false,
    canViewAllData: false,
  },
  member: {
    canViewMembers: false,
    canAddMembers: false,
    canEditMembers: false,
    canViewTithe: false,
    canRecordTithe: false,
    canViewChurchGiving: false,
    canRecordChurchGiving: false,
    canViewWelfare: false,
    canRecordWelfare: false,
    canViewInventory: false,
    canRecordInventory: false,
    canViewAttendance: false,
    canRecordAttendance: false,
    canViewExpenses: false,
    canRecordExpenses: false,
    canViewDepartment: false,
    canRecordDepartment: false,
    canViewProjectGiving: false,
    canRecordProjectGiving: false,
    canBackupData: false,
    canViewAllData: false,
  }
};

function hasPermission(permissionKey) {
  if (!currentUser || !PERMISSIONS[currentUser.role]) return false;
  return PERMISSIONS[currentUser.role][permissionKey] || false;
}

function showElement(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = '';
}

function hideElement(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

function getCurrentUserDisplayName() {
  if (!currentUser) return '';
  if (currentUser.role === 'member') {
    return `${currentUser.memberName} (Member)`;
  }
  return currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
}

function logout() {
  currentUser = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginForm').reset();
}

// ============ LOGIN FORM HANDLING ============
document.getElementById('loginUserType').addEventListener('change', (e) => {
  const userType = e.target.value;
  document.getElementById('staffLoginFields').style.display = userType === 'pastor' || userType === 'elder' ? 'block' : 'none';
  document.getElementById('memberLoginFields').style.display = userType === 'member' ? 'block' : 'none';
  document.getElementById('memberPasswordFields').style.display = userType === 'member' ? 'block' : 'none';
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userType = document.getElementById('loginUserType').value;
  const messageEl = document.getElementById('loginMessage');
  messageEl.style.display = 'block';
  
  if (!userType) {
    messageEl.textContent = 'Please select a user type.';
    messageEl.style.background = '#fee';
    messageEl.style.color = '#c33';
    return;
  }

  if (userType === 'member') {
    const membershipNo = document.getElementById('loginMembershipNo').value.trim();
    const password = document.getElementById('loginMemberPassword').value.trim();

    if (!membershipNo || !password) {
      messageEl.textContent = 'Please fill in all fields.';
      messageEl.style.background = '#fee';
      messageEl.style.color = '#c33';
      return;
    }

    const members = getStoredMembers();
    const member = members.find(m => m.membershipNumber === membershipNo);

    if (!member) {
      messageEl.textContent = 'Member not found.';
      messageEl.style.background = '#fee';
      messageEl.style.color = '#c33';
      return;
    }

    const lastThreeDigits = membershipNo.slice(-3);
    if (password !== lastThreeDigits) {
      messageEl.textContent = 'Invalid password (last 3 digits of membership number).';
      messageEl.style.background = '#fee';
      messageEl.style.color = '#c33';
      return;
    }

    currentUser = {
      role: 'member',
      membershipNumber: membershipNo,
      memberName: member.name,
      loginTime: new Date()
    };
  } else {
    const password = document.getElementById('loginPassword').value.trim();

    if (!password) {
      messageEl.textContent = 'Please enter a password.';
      messageEl.style.background = '#fee';
      messageEl.style.color = '#c33';
      return;
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== STAFF_CREDENTIALS[userType]) {
      messageEl.textContent = 'Invalid password.';
      messageEl.style.background = '#fee';
      messageEl.style.color = '#c33';
      return;
    }

    currentUser = {
      role: userType,
      loginTime: new Date()
    };
  }

  messageEl.textContent = 'Login successful! Redirecting...';
  messageEl.style.background = '#efe';
  messageEl.style.color = '#3c3';

  setTimeout(() => {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    messageEl.style.display = 'none';
    document.getElementById('loginForm').reset();
    document.getElementById('loginUserType').value = '';
    updateUIForRole();
  }, 1000);
});

// ============ UI UPDATES BASED ON ROLE ============
function updateUIForRole() {
  if (!currentUser) return;

  const role = currentUser.role;

  // Show/hide dashboard sections
  if (role === 'member') {
    hideElement('staffDashboardContainer');
    showElement('memberViewContainer');
    updateMemberView();
  } else {
    showElement('staffDashboardContainer');
    hideElement('memberViewContainer');
  }

  // Hide tithe card from elders
  if (role === 'elder') {
    hideElement('totalTithesCard');
  } else if (role === 'pastor') {
    showElement('totalTithesCard');
  }

  // Update tab visibility
  updateTabVisibility();

  // Update form sections
  updateFormSections();

  if (role === 'member') {
    showTab('logout');
  } else {
    ensureDefaultTabVisible();
  }

  // Add logout button if not present
  ensureLogoutButton();
}

function updateMemberView() {
  if (!currentUser || currentUser.role !== 'member') return;

  const member = getStoredMembers().find(m => m.membershipNumber === currentUser.membershipNumber);
  if (!member) return;

  document.getElementById('memberViewName').textContent = member.name;
  document.getElementById('memberViewMembershipNo').textContent = currentUser.membershipNumber;

  const tithes = getStoredTithes().filter(t => t.membershipNumber === currentUser.membershipNumber);
  const titheTotal = tithes.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  document.getElementById('memberViewTithes').textContent = `KES ${titheTotal.toFixed(2)}`;

  const churchGivings = getStoredChurchGiving().filter(g => g.membershipNumber === currentUser.membershipNumber);
  const churchTotal = churchGivings.reduce((sum, g) => sum + parseFloat(g.amount), 0);
  document.getElementById('memberViewChurchGiving').textContent = `KES ${churchTotal.toFixed(2)}`;

  const projectGivings = getStoredProjectGiving().filter(p => p.membershipNumber === currentUser.membershipNumber);
  const projectTotal = projectGivings.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  document.getElementById('memberViewProjectGiving').textContent = `KES ${projectTotal.toFixed(2)}`;

  attachMemberContributionClickHandlers();
}

function attachMemberContributionClickHandlers() {
  const tithesEl = document.getElementById('memberViewTithes');
  const projectEl = document.getElementById('memberViewProjectGiving');

  if (tithesEl) {
    tithesEl.style.cursor = 'pointer';
    tithesEl.title = 'Click to view your tithe breakdown by month and date';
    tithesEl.removeEventListener('click', handleMemberTitheClick);
    tithesEl.addEventListener('click', handleMemberTitheClick);
  }

  if (projectEl) {
    projectEl.style.cursor = 'pointer';
    projectEl.title = 'Click to view your project giving breakdown by month and date';
    projectEl.removeEventListener('click', handleMemberProjectClick);
    projectEl.addEventListener('click', handleMemberProjectClick);
  }
}

function handleMemberTitheClick() {
  showMemberContributionBreakdown('tithe');
}

function handleMemberProjectClick() {
  showMemberContributionBreakdown('project');
}

function getAllowedTabsForRole(role) {
  if (role === 'pastor') {
    return ['members', 'giving', 'tithe', 'project', 'inventory', 'welfare', 'attendance', 'expenses', 'department', 'addmember', 'backup', 'logout'];
  }
  if (role === 'elder') {
    return ['members', 'giving', 'project', 'inventory', 'welfare', 'attendance', 'expenses', 'department', 'logout'];
  }
  if (role === 'member') {
    return ['logout'];
  }
  return ['logout'];
}

function updateTabVisibility() {
  const tabs = document.querySelectorAll('.tab-btn');
  const allowedTabs = getAllowedTabsForRole(currentUser.role);

  tabs.forEach(tab => {
    const tabName = tab.dataset.tab;
    tab.style.display = allowedTabs.includes(tabName) ? '' : 'none';
  });
}

function ensureDefaultTabVisible() {
  const visibleTab = Array.from(document.querySelectorAll('.tab-btn')).find(tab => tab.style.display !== 'none');
  if (visibleTab) {
    showTab(visibleTab.dataset.tab);
  }
}

function setInventoryFormControlsEnabled(enabled) {
  const controlIds = ['inventoryItem', 'inventoryQuantity', 'inventoryLocation'];
  const submitBtn = document.querySelector('#inventoryForm button[type="submit"]');

  controlIds.forEach(id => {
    const control = document.getElementById(id);
    if (control) {
      control.disabled = !enabled;
    }
  });

  if (submitBtn) {
    submitBtn.disabled = !enabled;
  }
}

function updateFormSections() {
  const formContainers = document.querySelectorAll('[id$="FormContainer"]');
  if (currentUser.role === 'pastor') {
    formContainers.forEach(container => container.style.display = '');
    setInventoryFormControlsEnabled(true);
    return;
  } else if (currentUser.role === 'elder') {
    // Hide all record forms except allowed ones
    formContainers.forEach(container => {
      const id = container.id;
      if (['churchGivingFormContainer', 'welfareFormContainer', 'inventoryFormContainer', 'attendanceFormContainer', 'expenseFormContainer'].includes(id)) {
        container.style.display = '';
      } else {
        container.style.display = 'none';
      }
    });
    setInventoryFormControlsEnabled(true);
  } else if (currentUser.role === 'member') {
    // Members should not see any record forms, including inventory
    formContainers.forEach(container => container.style.display = 'none');
    setInventoryFormControlsEnabled(false);
  }
}

function ensureLogoutButton() {
  if (document.getElementById('logoutBtn')) return;

  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const logoutContainer = document.createElement('div');
  logoutContainer.id = 'logoutContainer';
  logoutContainer.style.cssText = 'margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);';
  logoutContainer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="font-size: 0.9rem; color: var(--muted);">Logged in as:</span>
      <span style="font-weight: 600; color: var(--text);">${getCurrentUserDisplayName()}</span>
    </div>
    <button id="logoutBtn" style="width: 100%; padding: 10px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.2s;">Logout</button>
  `;

  sidebar.appendChild(logoutContainer);

  document.getElementById('logoutBtn').addEventListener('click', logout);
}

// ============ TAB SWITCHING (Updated) ============
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

function showTab(tabName) {
  const allowedTabs = getAllowedTabsForRole(currentUser?.role);
  if (!allowedTabs.includes(tabName)) {
    return;
  }

  tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName));
  tabContents.forEach((c) => c.classList.toggle('active', c.id === tabName));
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    showTab(btn.dataset.tab);
  });
});

const logoutTabBtn = document.getElementById('logoutTabBtn');
if (logoutTabBtn) {
  logoutTabBtn.addEventListener('click', logout);
}

const totalTithesCard = document.getElementById('totalTithesCard');
if (totalTithesCard) {
  totalTithesCard.addEventListener('click', () => {
    showTab('tithe');

    const firstHeader = document.querySelector('#tithe .month-header');
    if (firstHeader) {
      const details = firstHeader.nextElementSibling;
      const toggle = firstHeader.querySelector('.month-toggle');
      if (details && !details.classList.contains('open')) {
        details.classList.add('open');
      }
      if (toggle && !toggle.classList.contains('open')) {
        toggle.classList.add('open');
      }
      firstHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

let currentSelectedMember = null;
let currentAttendanceEditId = null;

const membersTableBody = document.querySelector('#membersTable tbody');
const messageDiv = document.getElementById('message');
const totalMembersEl = document.getElementById('totalMembers');
const totalMalesEl = document.getElementById('totalMales');
const totalFemalesEl = document.getElementById('totalFemales');
const totalTithesEl = document.getElementById('totalTithes');
const groupTotalsEl = document.getElementById('groupTotals');
const memberForm = document.getElementById('memberForm');

const STORAGE_KEY = 'mizpahChurchMembers';
const GROUPS = ['Amani', 'Warriors of Christ', 'Jerusalem', 'Blessed Zion', 'Macedonia'];
const INVENTORY_STORAGE_KEY = 'mizpahInventory';
const PROJECT_GIVING_STORAGE_KEY = 'mizpahProjectGiving';
const TITHE_STORAGE_KEY = 'mizpahTithes';
const ATTENDANCE_STORAGE_KEY = 'mizpahAttendance';
const WELFARE_STORAGE_KEY = 'mizpahWelfare';
const CHURCH_GIVING_STORAGE_KEY = 'mizpahChurchGiving';
const DEPARTMENT_CONTRIBUTION_STORAGE_KEY = 'mizpahDepartmentContribution';
const EXPENSE_STORAGE_KEY = 'mizpahExpenses';
const BACKUP_STORAGE_KEY = 'mizpahLastBackupData';

function generateMembershipNumber() {
  const randomNumber = Math.floor(Math.random() * 1000);
  const padded = String(randomNumber).padStart(3, '0');
  return `MIZ-26/${padded}`;
}

function getStoredMembers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveMembers(members) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function showMessage(text) {
  messageDiv.textContent = text;
  setTimeout(() => {
    messageDiv.textContent = '';
  }, 3000);
}

function calculateStats(members) {
  const stats = {
    totalMembers: members.length,
    totalMales: 0,
    totalFemales: 0,
    totalTithes: 0,
    groups: {
      Amani: 0,
      'Warriors of Christ': 0,
      Jerusalem: 0,
      'Blessed Zion': 0,
      Macedonia: 0,
    },
  };

  members.forEach((member) => {
    if (member.gender === 'Male') stats.totalMales += 1;
    if (member.gender === 'Female') stats.totalFemales += 1;
    if (stats.groups[member.group] !== undefined) {
      stats.groups[member.group] += 1;
    }
  });

  // Calculate total tithes
  const allTithes = getStoredTithes();
  allTithes.forEach((tithe) => {
    stats.totalTithes += parseFloat(tithe.amount);
  });

  return stats;
}

function updateDashboard() {
  const members = getStoredMembers();
  const stats = calculateStats(members);

  totalMembersEl.textContent = stats.totalMembers;
  totalMalesEl.textContent = stats.totalMales;
  totalFemalesEl.textContent = stats.totalFemales;
  totalTithesEl.textContent = `KES ${stats.totalTithes.toFixed(2)}`;

  groupTotalsEl.innerHTML = GROUPS.map((group) => {
    return `<li>${group}: ${stats.groups[group] || 0}</li>`;
  }).join('');
}

function renderDashboard() {
  updateDashboard();
}

function renderMembers() {
  const members = getStoredMembers().slice().sort((a, b) => a.name.localeCompare(b.name));
  membersTableBody.innerHTML = '';

  if (members.length === 0) {
    membersTableBody.innerHTML = '<tr><td colspan="2">No members registered yet.</td></tr>';
    renderDashboard();
    return;
  }

  members.forEach((member) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="Membership No.">${member.membershipNumber}</td>
      <td data-label="Name">${member.name}</td>
    `;
    row.addEventListener('click', () => showMemberDetails(member));
    row.addEventListener('contextmenu', (e) => showContextMenu(e, member));
    membersTableBody.appendChild(row);
  });

  renderDashboard();
}

function groupContributionsByMonth(contributions) {
  const grouped = {};
  
  contributions.forEach((contribution) => {
    const date = new Date(contribution.date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped[yearMonth]) {
      grouped[yearMonth] = [];
    }
    
    grouped[yearMonth].push(contribution);
  });
  
  // Sort by year-month in descending order (newest first)
  const sorted = Object.keys(grouped).sort().reverse();
  return { grouped, sorted };
}

function formatMonthYear(yearMonthStr) {
  const [year, month] = yearMonthStr.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function getMemberContributions(membershipNumber) {
  const tithes = getStoredTithes().filter(t => t.membershipNumber === membershipNumber).map(t => ({
    ...t,
    type: 'tithe'
  }));
  
  const projectGivings = getStoredProjectGiving().filter(p => p.membershipNumber === membershipNumber).map(p => ({
    ...p,
    type: 'project'
  }));
  
  return [...tithes, ...projectGivings].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderMemberContributions(membershipNumber) {
  const contributions = getMemberContributions(membershipNumber);
  
  if (contributions.length === 0) {
    return `<p style="color: var(--muted); font-size: 0.9rem;">No contributions recorded yet.</p>`;
  }
  
  const { grouped, sorted } = groupContributionsByMonth(contributions);
  
  let html = '';
  sorted.forEach((yearMonth) => {
    const monthContributions = grouped[yearMonth];
    const monthTotal = monthContributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const formattedMonth = formatMonthYear(yearMonth);
    
    html += `
      <div class="month-group">
        <div class="month-header" onclick="toggleMonth(this)">
          <div class="month-header-left">
            <span class="month-toggle">▶</span>
            <span>${formattedMonth}</span>
          </div>
          <div class="month-header-right">KES ${monthTotal.toFixed(2)}</div>
        </div>
        <div class="month-details">
    `;
    
    monthContributions.forEach((contribution) => {
      const date = new Date(contribution.date);
      const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
      const typeLabel = contribution.type === 'tithe' ? 'Tithe' : 'Project Giving';
      const typeClass = contribution.type === 'tithe' ? 'tithe' : 'project';
      
      html += `
        <div class="contribution-item">
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="contribution-type ${typeClass}">${typeLabel}</span>
            <span class="contribution-item-date">${dateStr}</span>
          </div>
          <span class="contribution-item-amount">KES ${parseFloat(contribution.amount).toFixed(2)}</span>
        </div>
      `;
    });
    
    html += `
        <div class="month-total">
          <span>Total for ${formattedMonth}</span>
          <span>KES ${monthTotal.toFixed(2)}</span>
        </div>
        </div>
      </div>
    `;
  });
  
  return html;
}

function getMemberContributionsByType(membershipNumber, type) {
  return getMemberContributions(membershipNumber).filter(c => c.type === type);
}

function renderMemberContributionBreakdown(membershipNumber, type) {
  const contributions = getMemberContributionsByType(membershipNumber, type);
  const typeLabel = type === 'tithe' ? 'Tithe' : 'Project Giving';
  const noDataMessage = `<p style="color: var(--muted); font-size: 0.9rem;">No ${typeLabel.toLowerCase()} recorded yet.</p>`;

  if (contributions.length === 0) {
    return noDataMessage;
  }

  const { grouped, sorted } = groupContributionsByMonth(contributions);
  let html = '';

  sorted.forEach((yearMonth) => {
    const monthContributions = grouped[yearMonth];
    const monthTotal = monthContributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const formattedMonth = formatMonthYear(yearMonth);

    html += `
      <div class="month-group">
        <div class="month-header" onclick="toggleMonth(this)">
          <div class="month-header-left">
            <span class="month-toggle">▶</span>
            <span>${formattedMonth}</span>
          </div>
          <div class="month-header-right">KES ${monthTotal.toFixed(2)}</div>
        </div>
        <div class="month-details">
    `;

    monthContributions.forEach((contribution) => {
      const date = new Date(contribution.date);
      const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });

      html += `
        <div class="contribution-item">
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="contribution-type ${type === 'tithe' ? 'tithe' : 'project'}">${typeLabel}</span>
            <span class="contribution-item-date">${dateStr}</span>
          </div>
          <span class="contribution-item-amount">KES ${parseFloat(contribution.amount).toFixed(2)}</span>
        </div>
      `;
    });

    html += `
        <div class="month-total">
          <span>Total for ${formattedMonth}</span>
          <span>KES ${monthTotal.toFixed(2)}</span>
        </div>
        </div>
      </div>
    `;
  });

  return html;
}

function showMemberContributionBreakdown(type) {
  if (!currentUser || currentUser.role !== 'member') return;

  const member = getStoredMembers().find(m => m.membershipNumber === currentUser.membershipNumber);
  if (!member) return;

  const typeLabel = type === 'tithe' ? 'Tithe Breakdown' : 'Project Giving Breakdown';
  const breakdownHTML = renderMemberContributionBreakdown(member.membershipNumber, type);

  const detailPanel = document.getElementById('detailPanel');
  const memberDetails = document.getElementById('memberDetails');

  memberDetails.innerHTML = `
    <h3>${member.name}</h3>
    <div class="detail-field">
      <div class="detail-field-label">Membership Number</div>
      <div class="detail-field-value">${member.membershipNumber}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Group</div>
      <div class="detail-field-value">${member.group}</div>
    </div>
    <div class="contribution-section">
      <h4>${typeLabel}</h4>
      ${breakdownHTML}
    </div>
  `;

  detailPanel.classList.add('active');
  currentSelectedMember = member;
  setupActionButtons(member);
}

function updateTabVisibility() {
  const detailPanel = document.getElementById('detailPanel');
  const memberDetails = document.getElementById('memberDetails');

  const isOwnMember = currentUser && currentUser.role === 'member' && currentUser.membershipNumber === member.membershipNumber;
  const canViewContributions = isOwnMember || hasPermission('canViewTithe');
  const contributionsHTML = canViewContributions ? renderMemberContributions(member.membershipNumber) : '';
  
  memberDetails.innerHTML = `
    <h3>${member.name}</h3>
    <div class="detail-field">
      <div class="detail-field-label">Membership Number</div>
      <div class="detail-field-value">${member.membershipNumber}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Phone</div>
      <div class="detail-field-value">${member.phone}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Gender</div>
      <div class="detail-field-value">${member.gender}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Group</div>
      <div class="detail-field-value">${member.group}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Date Joined</div>
      <div class="detail-field-value">${member.dateJoined}</div>
    </div>
    
    ${canViewContributions ? `
    <div class="contribution-section">
      <h4>Contributions (Tithes & Project Giving)</h4>
      ${contributionsHTML}
    </div>
    ` : ''}
  `;

  detailPanel.classList.add('active');
  currentSelectedMember = member;
  setupActionButtons(member);
}

function closeMemberDetails() {
  const detailPanel = document.getElementById('detailPanel');
  detailPanel.classList.remove('active');
}

function toggleMonth(headerElement) {
  const toggle = headerElement.querySelector('.month-toggle');
  const details = headerElement.nextElementSibling;
  
  toggle.classList.toggle('open');
  details.classList.toggle('open');
}

function toggleFormSection(containerId) {
  const container = document.getElementById(containerId);
  container.classList.toggle('collapsed');
}

document.querySelector('.detail-close').addEventListener('click', closeMemberDetails);

// Tithe Management
function getStoredTithes() {
  const raw = localStorage.getItem(TITHE_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTithes(tithes) {
  localStorage.setItem(TITHE_STORAGE_KEY, JSON.stringify(tithes));
}

// Context Menu for Deletion
function showContextMenu(e, member) {
  e.preventDefault();
  const menu = document.createElement('div');
  menu.style.cssText = 'position: fixed; top: ' + e.clientY + 'px; left: ' + e.clientX + 'px; background: white; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 999;';
  
  const deleteOption = document.createElement('button');
  deleteOption.textContent = 'Delete Member';
  deleteOption.style.cssText = 'display: block; width: 100%; padding: 12px 16px; border: none; background: none; cursor: pointer; text-align: left; color: #ef4444; font-weight: 500;';
  deleteOption.onmouseover = () => deleteOption.style.background = '#fef2f2';
  deleteOption.onmouseout = () => deleteOption.style.background = 'none';
  deleteOption.onclick = () => {
    if (confirm('Are you sure you want to delete ' + member.name + '?')) {
      deleteMember(member.membershipNumber);
    }
    menu.remove();
  };
  
  menu.appendChild(deleteOption);
  document.body.appendChild(menu);
  
  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 0);
}

function deleteMember(membershipNumber) {
  if (!hasPermission('canEditMembers')) {
    alert('You do not have permission to delete members.');
    return;
  }
  const members = getStoredMembers();
  const filtered = members.filter(m => m.membershipNumber !== membershipNumber);
  saveMembers(filtered);
  closeMemberDetails();
  renderMembers();
}

// Member Editing
function setupActionButtons(member) {
  const editBtn = document.getElementById('editMemberBtn');
  const generateCardBtn = document.getElementById('generateCardBtn');
  const deleteBtn = document.getElementById('deleteMemberBtn');
  
  // Disable edit button for elders
  if (!hasPermission('canEditMembers')) {
    editBtn.style.display = 'none';
  } else {
    editBtn.onclick = () => openEditModal(member);
  }
  
  // Disable generate card for elders
  if (!hasPermission('canEditMembers')) {
    generateCardBtn.style.display = 'none';
  } else {
    generateCardBtn.onclick = () => generateMembershipCard(member);
  }
  
  // Disable delete button for elders
  if (!hasPermission('canEditMembers')) {
    deleteBtn.style.display = 'none';
  } else {
    deleteBtn.onclick = () => {
      if (confirm('Are you sure you want to delete ' + member.name + '?')) {
        deleteMember(member.membershipNumber);
      }
    };
  }
}

function openEditModal(member) {
  const modal = document.getElementById('editModal');
  document.getElementById('editName').value = member.name;
  document.getElementById('editPhone').value = member.phone;
  document.getElementById('editGender').value = member.gender;
  document.getElementById('editGroup').value = member.group;
  document.getElementById('editDateJoined').value = member.dateJoined;
  
  modal.style.display = 'flex';
  
  const editForm = document.getElementById('editForm');
  editForm.onsubmit = (e) => {
    e.preventDefault();
    const updatedMember = {
      ...member,
      name: document.getElementById('editName').value.trim(),
      phone: document.getElementById('editPhone').value.trim(),
      gender: document.getElementById('editGender').value,
      group: document.getElementById('editGroup').value,
      dateJoined: document.getElementById('editDateJoined').value,
    };
    
    let members = getStoredMembers();
    const index = members.findIndex(m => m.membershipNumber === member.membershipNumber);
    if (index !== -1) {
      members[index] = updatedMember;
      saveMembers(members);
      renderMembers();
      closeMemberDetails();
      modal.style.display = 'none';
    }
  };
}

function generateMembershipCard(member) {
  if (!hasPermission('canEditMembers')) {
    alert('You do not have permission to generate membership cards.');
    return;
  }
  const modal = document.getElementById('cardModal');
  const cardInfo = document.getElementById('cardInfo');
  
  cardInfo.innerHTML = `
    <div style="margin: 20px 0;">
      <h3 style="margin: 0 0 5px 0; font-size: 1.2rem;">${member.name}</h3>
      <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">ID: ${member.membershipNumber}</p>
    </div>
    <div style="margin: 20px 0; font-size: 0.85rem; opacity: 0.9;">
      <p style="margin: 5px 0;">Group: ${member.group}</p>
      <p style="margin: 5px 0;">Joined: ${member.dateJoined}</p>
    </div>
  `;
  
  modal.style.display = 'flex';
  
  document.getElementById('printCardBtn').onclick = () => {
    window.print();
  };
}

// Modal Controls
document.getElementById('closeEditModal').addEventListener('click', () => {
  document.getElementById('editModal').style.display = 'none';
});

document.getElementById('closeCardModal').addEventListener('click', () => {
  document.getElementById('cardModal').style.display = 'none';
});

document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target.id === 'editModal') {
    document.getElementById('editModal').style.display = 'none';
  }
});

document.getElementById('cardModal').addEventListener('click', (e) => {
  if (e.target.id === 'cardModal') {
    document.getElementById('cardModal').style.display = 'none';
  }
});

memberForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const gender = document.getElementById('gender').value;
  const group = document.getElementById('group').value;
  const dateJoined = document.getElementById('dateJoined').value;

  if (!name || !phone || !gender || !group || !dateJoined) {
    showMessage('Please fill in all member details.');
    return;
  }

  const membershipNumber = generateMembershipNumber();
  const newMember = { membershipNumber, name, phone, gender, group, dateJoined };

  const members = getStoredMembers();
  members.push(newMember);
  saveMembers(members);
  renderMembers();

  memberForm.reset();
  closeMemberDetails();
  showMessage(`Member registered with ID ${membershipNumber}`);
  
  // Switch to members tab after adding
  document.querySelector('[data-tab="members"]').click();
});

renderMembers();

// Inventory Management
const inventoryForm = document.getElementById('inventoryForm');
const inventoryTableBody = document.querySelector('#inventoryTable tbody');
const inventoryMessage = document.getElementById('inventoryMessage');

function getStoredInventory() {
  const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveInventory(items) {
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
}

function renderInventory() {
  const items = getStoredInventory();
  inventoryTableBody.innerHTML = '';

  if (items.length === 0) {
    inventoryTableBody.innerHTML = '<tr><td colspan="3">No items in inventory yet.</td></tr>';
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="Item">${item.itemName}</td>
      <td data-label="Quantity">${item.quantity}</td>
      <td data-label="Location">${item.location}</td>
    `;
    inventoryTableBody.appendChild(row);
  });
}

inventoryForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (currentUser && currentUser.role === 'member') {
    inventoryMessage.textContent = 'You do not have permission to record inventory.';
    setTimeout(() => { inventoryMessage.textContent = ''; }, 3000);
    return;
  }
  if (!hasPermission('canRecordInventory')) {
    inventoryMessage.textContent = 'You do not have permission to record inventory.';
    setTimeout(() => { inventoryMessage.textContent = ''; }, 3000);
    return;
  }

  const itemName = document.getElementById('inventoryItem').value.trim();
  const quantity = document.getElementById('inventoryQuantity').value.trim();
  const location = document.getElementById('inventoryLocation').value.trim();

  if (!itemName || !quantity || !location) {
    inventoryMessage.textContent = 'Please fill in all fields.';
    setTimeout(() => { inventoryMessage.textContent = ''; }, 3000);
    return;
  }

  const newItem = { itemName, quantity: parseInt(quantity), location };
  const items = getStoredInventory();
  items.push(newItem);
  saveInventory(items);
  renderInventory();

  inventoryForm.reset();
  inventoryMessage.textContent = 'Item added successfully.';
  setTimeout(() => { inventoryMessage.textContent = ''; }, 3000);
});

renderInventory();

// Project Giving Management
const projectForm = document.getElementById('projectForm');
const projectMessage = document.getElementById('projectMessage');
const projectMemberSearch = document.getElementById('projectMemberSearch');
const projectMemberSearchResults = document.getElementById('projectMemberSearchResults');
const projectMember = document.getElementById('projectMember');

function getStoredProjectGiving() {
  const raw = localStorage.getItem(PROJECT_GIVING_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveProjectGiving(records) {
  localStorage.setItem(PROJECT_GIVING_STORAGE_KEY, JSON.stringify(records));
}

function searchMembers(query) {
  if (!query.trim()) return [];
  
  const members = getStoredMembers();
  const searchTerm = query.toLowerCase();
  
  return members
    .filter(member => 
      member.name.toLowerCase().includes(searchTerm) || 
      member.membershipNumber.toLowerCase().includes(searchTerm)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderProjectMemberSearch(results, target) {
  const resultsContainer = document.getElementById(target);
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 12px 14px; color: var(--muted);">No members found</div>';
    resultsContainer.style.display = 'block';
    return;
  }
  
  resultsContainer.innerHTML = results.map(member => `
    <div class="member-search-item" onclick="selectProjectMember('${member.membershipNumber}', '${member.name.replace(/'/g, "\\'")}', '${target}')">
      <div class="member-search-name">${member.name}</div>
      <div class="member-search-id">${member.membershipNumber}</div>
    </div>
  `).join('');
  
  resultsContainer.style.display = 'block';
}

function selectProjectMember(membershipNumber, memberName, resultsTarget) {
  projectMember.value = membershipNumber;
  projectMemberSearch.value = `${memberName} (${membershipNumber})`;
  document.getElementById(resultsTarget).style.display = 'none';
}

function renderProjectGiving() {
  const records = getStoredProjectGiving();
  const members = getStoredMembers();
  const projectGroupList = document.getElementById('projectGroupList');
  projectGroupList.innerHTML = '';

  const groupRecords = {};
  GROUPS.forEach((group) => {
    groupRecords[group] = [];
  });

  records.forEach((record) => {
    const member = members.find(m => m.membershipNumber === record.membershipNumber);
    if (member && groupRecords[member.group] !== undefined) {
      groupRecords[member.group].push({
        ...record,
        memberName: member.name,
      });
    }
  });

  GROUPS.forEach((group) => {
    const recordsForGroup = groupRecords[group];
    const total = recordsForGroup.reduce((sum, record) => sum + parseFloat(record.amount), 0);
    const contributorCount = new Set(recordsForGroup.map(record => record.membershipNumber)).size;

    const groupItem = document.createElement('li');
    groupItem.innerHTML = `
      <div class="month-group">
        <div class="month-header" onclick="toggleMonth(this)">
          <div class="month-header-left">
            <span class="month-toggle">▶</span>
            <span>${group}</span>
          </div>
          <div class="month-header-right">KES ${total.toFixed(2)} • ${contributorCount} contributors</div>
        </div>
        <div class="month-details">
          ${recordsForGroup.length === 0 ? '<p style="color: var(--muted); font-size: 0.95rem; margin: 0;">No contributions recorded for this group.</p>' : recordsForGroup.map(record => {
            const date = new Date(record.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
            return `
              <div class="contribution-item">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <span class="member-search-name">${record.memberName}</span>
                  <span class="contribution-item-date">${date}</span>
                </div>
                <span class="contribution-item-amount">KES ${parseFloat(record.amount).toFixed(2)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    projectGroupList.appendChild(groupItem);
  });
}

projectMemberSearch.addEventListener('input', (e) => {
  const query = e.target.value;
  
  if (!query.trim()) {
    projectMemberSearchResults.style.display = 'none';
    return;
  }
  
  const results = searchMembers(query);
  renderProjectMemberSearch(results, 'projectMemberSearchResults');
});

// Close search results when clicking elsewhere
document.addEventListener('click', (e) => {
  if (!e.target.closest('#projectMemberSearch') && !e.target.closest('#projectMemberSearchResults')) {
    projectMemberSearchResults.style.display = 'none';
  }
  if (!e.target.closest('#titheMemberSearch') && !e.target.closest('#titheMemberSearchResults')) {
    document.getElementById('titheMemberSearchResults').style.display = 'none';
  }
  if (!e.target.closest('#welfareBeneficiarySearch') && !e.target.closest('#welfareBeneficiarySearchResults')) {
    document.getElementById('welfareBeneficiarySearchResults').style.display = 'none';
  }
  if (!e.target.closest('#welfareContributorSearch') && !e.target.closest('#welfareContributorSearchResults')) {
    document.getElementById('welfareContributorSearchResults').style.display = 'none';
  }
});

projectForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (currentUser && currentUser.role === 'member') {
    projectMessage.textContent = 'You do not have permission to record project giving.';
    setTimeout(() => { projectMessage.textContent = ''; }, 3000);
    return;
  }
  if (!hasPermission('canRecordProjectGiving')) {
    projectMessage.textContent = 'You do not have permission to record project giving.';
    setTimeout(() => { projectMessage.textContent = ''; }, 3000);
    return;
  }

  const selectedMemberId = projectMember.value;
  const amount = document.getElementById('projectAmount').value.trim();
  const date = document.getElementById('projectDate').value;

  if (!selectedMemberId || !amount || !date) {
    projectMessage.textContent = 'Please fill in all fields.';
    setTimeout(() => { projectMessage.textContent = ''; }, 3000);
    return;
  }

  const members = getStoredMembers();
  const member = members.find((m) => m.membershipNumber === selectedMemberId);

  if (!member) {
    projectMessage.textContent = 'Member not found.';
    setTimeout(() => { projectMessage.textContent = ''; }, 3000);
    return;
  }

  const newRecord = {
    membershipNumber: selectedMemberId,
    memberName: member.name,
    amount,
    date,
  };

  const records = getStoredProjectGiving();
  records.push(newRecord);
  saveProjectGiving(records);
  renderProjectGiving();
  
  // Refresh member details if currently viewing
  if (currentSelectedMember && currentSelectedMember.membershipNumber === selectedMemberId) {
    showMemberDetails(currentSelectedMember);
  }

  projectForm.reset();
  projectMember.value = '';
  projectMessage.textContent = 'Project giving recorded successfully.';
  setTimeout(() => { projectMessage.textContent = ''; }, 3000);
});

document.getElementById('closeProjectForm').addEventListener('click', (e) => {
  e.preventDefault();
  projectForm.reset();
  projectMember.value = '';
  projectMemberSearchResults.style.display = 'none';
});

renderProjectGiving();

// Welfare Management
const welfareForm = document.getElementById('welfareForm');
const welfareMessage = document.getElementById('welfareMessage');
const welfareBeneficiarySearch = document.getElementById('welfareBeneficiarySearch');
const welfareBeneficiarySearchResults = document.getElementById('welfareBeneficiarySearchResults');
const welfareBeneficiary = document.getElementById('welfareBeneficiary');
const welfareContributorSearch = document.getElementById('welfareContributorSearch');
const welfareContributorSearchResults = document.getElementById('welfareContributorSearchResults');
const welfareContributor = document.getElementById('welfareContributor');

function getStoredWelfare() {
  const raw = localStorage.getItem(WELFARE_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveWelfare(records) {
  localStorage.setItem(WELFARE_STORAGE_KEY, JSON.stringify(records));
}

function renderWelfareMemberSearch(results, target) {
  const resultsContainer = document.getElementById(target);

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 12px 14px; color: var(--muted);">No members found</div>';
    resultsContainer.style.display = 'block';
    return;
  }

  resultsContainer.innerHTML = results.map(member => `
    <div class="member-search-item" onclick="selectWelfareMember('${member.membershipNumber}', '${member.name.replace(/'/g, "\\'")}', '${target}')">
      <div class="member-search-name">${member.name}</div>
      <div class="member-search-id">${member.membershipNumber}</div>
    </div>
  `).join('');

  resultsContainer.style.display = 'block';
}

function selectWelfareMember(membershipNumber, memberName, resultsTarget) {
  const hiddenInput = resultsTarget === 'welfareBeneficiarySearchResults'
    ? welfareBeneficiary
    : welfareContributor;
  const searchInput = resultsTarget === 'welfareBeneficiarySearchResults'
    ? welfareBeneficiarySearch
    : welfareContributorSearch;

  hiddenInput.value = membershipNumber;
  searchInput.value = `${memberName} (${membershipNumber})`;
  document.getElementById(resultsTarget).style.display = 'none';
}

function renderWelfare() {
  const records = getStoredWelfare();
  const listContainer = document.getElementById('welfareRecordList');
  listContainer.innerHTML = '';

  if (records.length === 0) {
    listContainer.innerHTML = '<p style="color: var(--muted); font-size: 0.95rem;">No welfare records yet.</p>';
    return;
  }

  // Group records by beneficiary
  const groupedByBeneficiary = {};
  records.forEach((record) => {
    const key = record.beneficiaryMembershipNumber;
    if (!groupedByBeneficiary[key]) {
      groupedByBeneficiary[key] = {
        beneficiaryName: record.beneficiaryName,
        membershipNumber: record.beneficiaryMembershipNumber,
        records: [],
      };
    }
    groupedByBeneficiary[key].records.push(record);
  });

  // Sort beneficiaries by name, and records by date within each group
  Object.keys(groupedByBeneficiary).sort((a, b) => {
    return groupedByBeneficiary[a].beneficiaryName.localeCompare(groupedByBeneficiary[b].beneficiaryName);
  }).forEach((beneficiaryKey) => {
    const group = groupedByBeneficiary[beneficiaryKey];
    const sortedRecords = group.records.sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalAmount = sortedRecords.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const contributorCount = new Set(sortedRecords.map(r => r.contributorMembershipNumber)).size;

    const groupElement = document.createElement('div');
    groupElement.className = 'month-group';
    groupElement.innerHTML = `
      <div class="month-header" onclick="toggleMonth(this)">
        <div class="month-header-left">
          <span class="month-toggle">▶</span>
          <span class="beneficiary-badge">${group.beneficiaryName}</span>
        </div>
        <div class="month-header-right">KES ${totalAmount.toFixed(2)} • ${contributorCount} contributor${contributorCount !== 1 ? 's' : ''}</div>
      </div>
      <div class="month-details">
        ${sortedRecords.map((record) => {
          const date = new Date(record.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
          return `
            <div class="contribution-item">
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span class="member-search-name">From: ${record.contributorName}</span>
                <span class="contribution-item-date">${date}</span>
              </div>
              <span class="contribution-item-amount">KES ${parseFloat(record.amount).toFixed(2)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
    listContainer.appendChild(groupElement);
  });
}

welfareBeneficiarySearch.addEventListener('input', (e) => {
  const query = e.target.value;
  if (!query.trim()) {
    welfareBeneficiarySearchResults.style.display = 'none';
    return;
  }
  const results = searchMembers(query);
  renderWelfareMemberSearch(results, 'welfareBeneficiarySearchResults');
});

welfareContributorSearch.addEventListener('input', (e) => {
  const query = e.target.value;
  if (!query.trim()) {
    welfareContributorSearchResults.style.display = 'none';
    return;
  }
  const results = searchMembers(query);
  renderWelfareMemberSearch(results, 'welfareContributorSearchResults');
});

welfareForm.addEventListener('submit', (event) => {
  event.preventDefault();

  // SECURITY: Block members from recording welfare
  if (currentUser && currentUser.role === 'member') {
    welfareMessage.textContent = 'You do not have permission to record welfare.';
    setTimeout(() => { welfareMessage.textContent = ''; }, 3000);
    return;
  }

  // PERMISSION CHECK: Verify user has welfare recording permission
  if (!hasPermission('canRecordWelfare')) {
    welfareMessage.textContent = 'You do not have permission to record welfare.';
    setTimeout(() => { welfareMessage.textContent = ''; }, 3000);
    return;
  }

  const beneficiaryId = welfareBeneficiary.value;
  const contributorId = welfareContributor.value;
  const amount = document.getElementById('welfareAmount').value.trim();
  const date = document.getElementById('welfareDate').value;

  if (!beneficiaryId || !contributorId || !amount || !date) {
    welfareMessage.textContent = 'Please fill in all welfare fields.';
    setTimeout(() => { welfareMessage.textContent = ''; }, 3000);
    return;
  }

  const members = getStoredMembers();
  const beneficiary = members.find((m) => m.membershipNumber === beneficiaryId);
  const contributor = members.find((m) => m.membershipNumber === contributorId);

  if (!beneficiary || !contributor) {
    welfareMessage.textContent = 'Beneficiary or contributor not found.';
    setTimeout(() => { welfareMessage.textContent = ''; }, 3000);
    return;
  }

  const newRecord = {
    beneficiaryMembershipNumber: beneficiaryId,
    beneficiaryName: beneficiary.name,
    contributorMembershipNumber: contributorId,
    contributorName: contributor.name,
    amount,
    date,
  };

  const records = getStoredWelfare();
  records.push(newRecord);
  saveWelfare(records);
  renderWelfare();

  welfareForm.reset();
  welfareBeneficiary.value = '';
  welfareContributor.value = '';
  welfareMessage.textContent = 'Welfare record saved successfully.';
  setTimeout(() => { welfareMessage.textContent = ''; }, 3000);
});

document.getElementById('closeWelfareForm').addEventListener('click', (e) => {
  e.preventDefault();
  welfareForm.reset();
  welfareBeneficiary.value = '';
  welfareContributor.value = '';
  welfareBeneficiarySearchResults.style.display = 'none';
  welfareContributorSearchResults.style.display = 'none';
});

renderWelfare();

// Expense Management
const expenseForm = document.getElementById('expenseForm');
const expenseMessage = document.getElementById('expenseMessage');

function getStoredExpenses() {
  const raw = localStorage.getItem(EXPENSE_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveExpenses(expenses) {
  localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
}

function getTotalExpensesForDate(date) {
  const expenses = getStoredExpenses();
  return expenses
    .filter(expense => expense.date === date)
    .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
}

function renderExpenses() {
  const expenses = getStoredExpenses();
  const monthGroupsContainer = document.getElementById('expenseMonthGroups');
  monthGroupsContainer.innerHTML = '';

  if (expenses.length === 0) {
    monthGroupsContainer.innerHTML = '<p style="color: var(--muted); font-size: 0.95rem;">No expense records yet.</p>';
    return;
  }

  // Group expenses by month/year
  const { grouped, sorted } = groupContributionsByMonth(expenses);

  sorted.forEach((yearMonth) => {
    const monthExpenses = grouped[yearMonth];
    const formattedMonth = formatMonthYear(yearMonth);
    const monthTotal = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const monthGroup = document.createElement('div');
    monthGroup.className = 'month-group';
    monthGroup.innerHTML = `
      <div class="month-header" onclick="toggleMonth(this)">
        <div class="month-header-left">
          <span class="month-toggle">▶</span>
          <span>${formattedMonth}</span>
        </div>
        <div class="month-header-right">KES ${monthTotal.toFixed(2)}</div>
      </div>
      <div class="month-details">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Date</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Expense Type</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Amount (KES)</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${monthExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map((expense) => {
              const date = new Date(expense.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
              return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px; color: var(--muted); font-size: 0.9rem;">${date}</td>
                  <td style="padding: 10px;">${expense.type}</td>
                  <td style="padding: 10px; font-weight: 600; color: #ef4444;">KES ${parseFloat(expense.amount).toFixed(2)}</td>
                  <td style="padding: 10px; color: var(--muted); font-size: 0.9rem;">${expense.notes || '-'}</td>
                </tr>
              `;
            }).join('')}
            <tr style="border-top: 2px solid var(--border); background: #f8fafc; font-weight: 600; color: #ef4444;">
              <td colspan="3" style="padding: 10px; text-align: right;">TOTAL</td>
              <td style="padding: 10px; font-weight: 700;">KES ${monthTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    monthGroupsContainer.appendChild(monthGroup);
  });
}

expenseForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (currentUser && currentUser.role === 'member') {
    expenseMessage.textContent = 'You do not have permission to record expenses.';
    setTimeout(() => { expenseMessage.textContent = ''; }, 3000);
    return;
  }
  if (!hasPermission('canRecordExpenses')) {
    expenseMessage.textContent = 'You do not have permission to record expenses.';
    setTimeout(() => { expenseMessage.textContent = ''; }, 3000);
    return;
  }

  const type = document.getElementById('expenseType').value.trim();
  const date = document.getElementById('expenseDate').value;
  const amount = document.getElementById('expenseAmount').value.trim();
  const notes = document.getElementById('expenseNotes').value.trim();

  if (!type || !date || !amount) {
    expenseMessage.textContent = 'Please fill in all required fields.';
    setTimeout(() => { expenseMessage.textContent = ''; }, 3000);
    return;
  }

  const newExpense = {
    type,
    date,
    amount: parseFloat(amount).toFixed(2),
    notes: notes || '',
  };

  const expenses = getStoredExpenses();
  expenses.push(newExpense);
  saveExpenses(expenses);
  renderExpenses();
  renderChurchGiving();

  expenseForm.reset();
  expenseMessage.textContent = 'Expense recorded successfully.';
  setTimeout(() => { expenseMessage.textContent = ''; }, 3000);
});

document.getElementById('closeExpenseForm').addEventListener('click', (e) => {
  e.preventDefault();
  expenseForm.reset();
});

renderExpenses();

// Church Giving Management
const churchGivingForm = document.getElementById('churchGivingForm');
const givingMessage = document.getElementById('givingMessage');
const givingType = document.getElementById('givingType');
const givingAmount = document.getElementById('givingAmount');

function getStoredChurchGiving() {
  const raw = localStorage.getItem(CHURCH_GIVING_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveChurchGiving(records) {
  localStorage.setItem(CHURCH_GIVING_STORAGE_KEY, JSON.stringify(records));
}

function getTitheForDate(date) {
  const tithes = getStoredTithes();
  const dateTithes = tithes.filter(tithe => tithe.date === date);
  return dateTithes.reduce((sum, tithe) => sum + parseFloat(tithe.amount), 0);
}

function renderChurchGiving() {
  const records = getStoredChurchGiving();
  const monthGroupsContainer = document.getElementById('givingMonthGroups');
  monthGroupsContainer.innerHTML = '';

  if (records.length === 0) {
    monthGroupsContainer.innerHTML = '<p style="color: var(--muted); font-size: 0.95rem;">No church giving records yet.</p>';
    return;
  }

  // Group records by month/year
  const { grouped, sorted } = groupContributionsByMonth(records);

  sorted.forEach((yearMonth) => {
    const monthRecords = grouped[yearMonth];
    const formattedMonth = formatMonthYear(yearMonth);
    
    // Calculate totals by type
    const typeTotals = {};
    const types = ['offering', 'thanksgiving', 'seed', 'sundayschool', 'mission', 'other', 'tithe'];
    types.forEach(type => {
      typeTotals[type] = monthRecords
        .filter(r => r.type === type)
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);
    });
    
    const totalForMonth = Object.values(typeTotals).reduce((sum, val) => sum + val, 0);

    const recordsByDate = {};
    monthRecords.forEach((record) => {
      if (!recordsByDate[record.date]) {
        recordsByDate[record.date] = [];
      }
      recordsByDate[record.date].push(record);
    });

    const sortedDates = Object.keys(recordsByDate).sort((a, b) => new Date(b) - new Date(a));
    const dateTotals = sortedDates.map((date) => {
      const records = recordsByDate[date];
      return records.reduce((sum, record) => sum + parseFloat(record.amount), 0);
    });

    const monthGroup = document.createElement('div');
    monthGroup.className = 'month-group';
    
    // Calculate month expenses
    const monthExpenses = getStoredExpenses().filter(e => {
      const expDate = new Date(e.date);
      const expYearMonth = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
      return expYearMonth === yearMonth;
    });
    const totalExpensesForMonth = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const balanceForMonth = totalForMonth - totalExpensesForMonth;

    monthGroup.innerHTML = `
      <div class="month-header" onclick="toggleMonth(this)">
        <div class="month-header-left">
          <span class="month-toggle">▶</span>
          <span>${formattedMonth}</span>
        </div>
        <div class="month-header-right">KES ${balanceForMonth.toFixed(2)}</div>
      </div>
      <div class="month-details">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Date</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Offering</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Thanksgiving</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Seed</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Sunday School</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Mission</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Other</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Tithe</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Total</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Expenses</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${sortedDates.map((date, index) => {
              const records = recordsByDate[date];
              const rowTotals = types.map(type => {
                const amount = records
                  .filter(record => record.type === type)
                  .reduce((sum, record) => sum + parseFloat(record.amount), 0);
                return amount;
              });
              const totalForDate = rowTotals.reduce((sum, amount) => sum + amount, 0);
              const expensesForDate = getTotalExpensesForDate(date);
              const balanceForDate = totalForDate - expensesForDate;
              const dateLabel = new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });

              return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px; color: var(--muted); font-size: 0.9rem;">${dateLabel}</td>
                  ${rowTotals.map(amount => ` <td style="padding: 10px; font-weight: 600; color: ${amount ? 'var(--primary)' : 'var(--muted)'};">${amount ? `KES ${amount.toFixed(2)}` : '-'}</td>`).join('')}
                  <td style="padding: 10px; font-weight: 700;">KES ${totalForDate.toFixed(2)}</td>
                  <td style="padding: 10px; font-weight: 600; color: #ef4444;">KES ${expensesForDate.toFixed(2)}</td>
                  <td style="padding: 10px; font-weight: 700; color: ${balanceForDate >= 0 ? 'var(--primary)' : '#ef4444'};">KES ${balanceForDate.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
            <tr style="border-top: 2px solid var(--border); background: #f8fafc; font-weight: 600; color: var(--primary);">
              <td style="padding: 10px; text-align: right;">TOTAL</td>
              ${types.map(type => ` <td style="padding: 10px; font-weight: 600;">KES ${typeTotals[type].toFixed(2)}</td>`).join('')}
              <td style="padding: 10px; font-weight: 700;">KES ${totalForMonth.toFixed(2)}</td>
              <td style="padding: 10px; font-weight: 700; color: #ef4444;">KES ${totalExpensesForMonth.toFixed(2)}</td>
              <td style="padding: 10px; font-weight: 700; color: ${balanceForMonth >= 0 ? 'var(--primary)' : '#ef4444'};">KES ${balanceForMonth.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    monthGroupsContainer.appendChild(monthGroup);
  });
}

givingType.addEventListener('change', (e) => {
  // Update amount label when tithe is selected
  const label = givingAmount.closest('label');
  if (e.target.value === 'tithe') {
    label.querySelector('label') || (label.innerHTML = `<div style="font-size: 0.95rem; color: var(--muted);">Amount (KES) - Will be auto-calculated from tithe date</div>` + label.innerHTML);
  }
});

churchGivingForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (currentUser && currentUser.role === 'member') {
    givingMessage.textContent = 'You do not have permission to record church giving.';
    setTimeout(() => { givingMessage.textContent = ''; }, 3000);
    return;
  }
  if (!hasPermission('canRecordChurchGiving')) {
    givingMessage.textContent = 'You do not have permission to record church giving.';
    setTimeout(() => { givingMessage.textContent = ''; }, 3000);
    return;
  }

  const type = givingType.value;
  const date = document.getElementById('givingDate').value;
  let amount = document.getElementById('givingAmount').value.trim();
  const notes = document.getElementById('givingNotes').value.trim();

  if (!type || !date) {
    givingMessage.textContent = 'Please fill in giving type and date.';
    setTimeout(() => { givingMessage.textContent = ''; }, 3000);
    return;
  }

  // Auto-fetch tithe for the date
  if (type === 'tithe') {
    amount = getTitheForDate(date).toString();
    if (parseFloat(amount) === 0) {
      givingMessage.textContent = 'No tithe recorded for this date. Please record tithe first.';
      setTimeout(() => { givingMessage.textContent = ''; }, 3000);
      return;
    }
  }

  if (!amount) {
    givingMessage.textContent = 'Please enter an amount.';
    setTimeout(() => { givingMessage.textContent = ''; }, 3000);
    return;
  }

  const newRecord = {
    type,
    amount: parseFloat(amount).toFixed(2),
    date,
    notes: notes || '',
  };

  const records = getStoredChurchGiving();
  records.push(newRecord);
  saveChurchGiving(records);
  renderChurchGiving();

  churchGivingForm.reset();
  givingMessage.textContent = 'Church giving recorded successfully.';
  setTimeout(() => { givingMessage.textContent = ''; }, 3000);
});

document.getElementById('closeGivingForm').addEventListener('click', (e) => {
  e.preventDefault();
  churchGivingForm.reset();
});

renderChurchGiving();

// Attendance Management
const attendanceForm = document.getElementById('attendanceForm');
const attendanceDate = document.getElementById('attendanceDate');
const attendanceAdults = document.getElementById('attendanceAdults');
const attendanceTeens = document.getElementById('attendanceTeens');
const attendanceSundaySchool = document.getElementById('attendanceSundaySchool');
const attendanceMessage = document.getElementById('attendanceMessage');

function getStoredAttendance() {
  const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
  const records = raw ? JSON.parse(raw) : [];
  let updated = false;
  const normalized = records.map((record, index) => {
    const baseRecord = {
      ...record,
      id: record.id || `${record.date}-${record.adults}-${record.teens}-${record.sundaySchool}-${index}`,
      createdAt: record.createdAt || record.date,
      updatedAt: record.updatedAt || record.createdAt || record.date,
    };
    if (!record.id || !record.createdAt || !record.updatedAt) {
      updated = true;
    }
    return baseRecord;
  });
  if (updated) {
    saveAttendance(normalized);
  }
  return normalized;
}

function saveAttendance(records) {
  localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
}

function renderAttendance() {
  const attendances = getStoredAttendance();
  const attendanceContainer = document.getElementById('attendanceMonthGroups');
  attendanceContainer.innerHTML = '';

  if (attendances.length === 0) {
    attendanceContainer.innerHTML = '<p style="color: var(--muted); font-size: 0.95rem;">No attendance records yet.</p>';
    return;
  }

  attendances.sort((a, b) => new Date(b.date) - new Date(a.date));
  const { grouped, sorted } = groupContributionsByMonth(attendances);

  sorted.forEach((yearMonth) => {
    const records = grouped[yearMonth];
    const totalSessions = records.length;
    const totalAdults = records.reduce((sum, record) => sum + parseInt(record.adults, 10), 0);
    const totalTeens = records.reduce((sum, record) => sum + parseInt(record.teens, 10), 0);
    const totalSundaySchool = records.reduce((sum, record) => sum + parseInt(record.sundaySchool, 10), 0);
    const formattedMonth = formatMonthYear(yearMonth);

    const monthGroup = document.createElement('div');
    monthGroup.className = 'month-group';
    monthGroup.innerHTML = `
      <div class="month-header" onclick="toggleMonth(this)">
        <div class="month-header-left">
          <span class="month-toggle">▶</span>
          <span>${formattedMonth}</span>
        </div>
        <div class="month-header-right">${totalSessions} sessions</div>
      </div>
      <div class="month-details">
        ${records.map((record) => {
          const date = new Date(record.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
          const createdAt = new Date(record.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
          const updatedAt = new Date(record.updatedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
          const timestampLabel = record.updatedAt && record.updatedAt !== record.createdAt
            ? `Updated: ${updatedAt}`
            : `Created: ${createdAt}`;
          return `
            <div class="contribution-item" style="justify-content: space-between; gap: 12px;">
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span class="member-search-name">${date}</span>
                <span class="contribution-item-date">Adults: ${record.adults} • Teens: ${record.teens} • Sunday School: ${record.sundaySchool}</span>
                <span style="font-size: 0.8rem; color: var(--muted);">${timestampLabel}</span>
              </div>
              <button type="button" onclick="startAttendanceEdit('${record.id}')" style="padding: 8px 12px; border: none; border-radius: 8px; background: #2563eb; color: white; cursor: pointer;">Edit</button>
            </div>
          `;
        }).join('')}
        <div class="month-total" style="flex-direction: column; align-items: flex-start; gap: 6px;">
          <span>Total Adults: ${totalAdults}</span>
          <span>Total Teens: ${totalTeens}</span>
          <span>Total Sunday School: ${totalSundaySchool}</span>
        </div>
      </div>
    `;

    attendanceContainer.appendChild(monthGroup);
  });
}

attendanceForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (currentUser && currentUser.role === 'member') {
    attendanceMessage.textContent = 'You do not have permission to record attendance.';
    setTimeout(() => { attendanceMessage.textContent = ''; }, 3000);
    return;
  }
  if (!hasPermission('canRecordAttendance')) {
    attendanceMessage.textContent = 'You do not have permission to record attendance.';
    setTimeout(() => { attendanceMessage.textContent = ''; }, 3000);
    return;
  }

  const date = attendanceDate.value;
  const adults = attendanceAdults.value.trim();
  const teens = attendanceTeens.value.trim();
  const sundaySchool = attendanceSundaySchool.value.trim();

  if (!date || adults === '' || teens === '' || sundaySchool === '') {
    attendanceMessage.textContent = 'Please fill in all attendance fields.';
    setTimeout(() => { attendanceMessage.textContent = ''; }, 3000);
    return;
  }

  const now = new Date().toISOString();
  const newAttendance = {
    id: currentAttendanceEditId || `${date}-${adults}-${teens}-${sundaySchool}-${Date.now()}`,
    date,
    adults: parseInt(adults, 10),
    teens: parseInt(teens, 10),
    sundaySchool: parseInt(sundaySchool, 10),
    createdAt: currentAttendanceEditId ? undefined : now,
    updatedAt: now,
  };

  const records = getStoredAttendance();

  if (currentAttendanceEditId) {
    const updatedRecords = records.map((record) => {
      if (record.id === currentAttendanceEditId) {
        return {
          ...record,
          date,
          adults: parseInt(adults, 10),
          teens: parseInt(teens, 10),
          sundaySchool: parseInt(sundaySchool, 10),
          updatedAt: now,
        };
      }
      return record;
    });
    saveAttendance(updatedRecords);
    attendanceMessage.textContent = 'Attendance updated successfully.';
  } else {
    records.push(newAttendance);
    saveAttendance(records);
    attendanceMessage.textContent = 'Attendance recorded successfully.';
  }

  renderAttendance();
  resetAttendanceForm();
  setTimeout(() => { attendanceMessage.textContent = ''; }, 3000);
});

document.getElementById('closeAttendanceForm').addEventListener('click', (e) => {
  e.preventDefault();
  resetAttendanceForm();
});

document.getElementById('cancelAttendanceEditBtn').addEventListener('click', (e) => {
  e.preventDefault();
  resetAttendanceForm();
});

function startAttendanceEdit(recordId) {
  const record = getStoredAttendance().find((item) => item.id === recordId);
  if (!record) return;

  currentAttendanceEditId = recordId;
  attendanceDate.value = record.date;
  attendanceAdults.value = record.adults;
  attendanceTeens.value = record.teens;
  attendanceSundaySchool.value = record.sundaySchool;
  document.getElementById('attendanceSubmitBtn').textContent = 'Update Attendance';
  document.getElementById('cancelAttendanceEditBtn').style.display = 'inline-flex';
}

function resetAttendanceForm() {
  currentAttendanceEditId = null;
  attendanceForm.reset();
  document.getElementById('attendanceSubmitBtn').textContent = 'Record Attendance';
  document.getElementById('cancelAttendanceEditBtn').style.display = 'none';
}

renderAttendance();

// Tithe Tab Management
const titheTabForm = document.getElementById('titheTabForm');
const titheMemberSearch = document.getElementById('titheMemberSearch');
const titheMemberSearchResults = document.getElementById('titheMemberSearchResults');
const titheMember = document.getElementById('titheMember');
const titheMessage = document.getElementById('titheMessage');

function populateTitheMemberSelect() {
  // No longer needed as we use search instead
}

function renderTitheMemberSearch(results, target) {
  const resultsContainer = document.getElementById(target);
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 12px 14px; color: var(--muted);">No members found</div>';
    resultsContainer.style.display = 'block';
    return;
  }
  
  resultsContainer.innerHTML = results.map(member => `
    <div class="member-search-item" onclick="selectTitheMember('${member.membershipNumber}', '${member.name.replace(/'/g, "\\'")}', '${target}')">
      <div class="member-search-name">${member.name}</div>
      <div class="member-search-id">${member.membershipNumber}</div>
    </div>
  `).join('');
  
  resultsContainer.style.display = 'block';
}

function selectTitheMember(membershipNumber, memberName, resultsTarget) {
  titheMember.value = membershipNumber;
  titheMemberSearch.value = `${memberName} (${membershipNumber})`;
  document.getElementById(resultsTarget).style.display = 'none';
}

function renderTitheTab() {
  const tithes = getStoredTithes();
  const members = getStoredMembers();
  const monthGroupsContainer = document.getElementById('titheMonthGroups');
  monthGroupsContainer.innerHTML = '';

  if (tithes.length === 0) {
    monthGroupsContainer.innerHTML = '<p style="color: var(--muted); font-size: 0.95rem;">No tithe records yet.</p>';
    return;
  }

  const { grouped, sorted } = groupContributionsByMonth(tithes);

  sorted.forEach((yearMonth) => {
    const monthTithes = grouped[yearMonth];
    const monthTotal = monthTithes.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const formattedMonth = formatMonthYear(yearMonth);

    const memberCount = monthTithes.length;
    const monthGroup = document.createElement('div');
    monthGroup.className = 'month-group';
    monthGroup.innerHTML = `
      <div class="month-header" onclick="toggleMonth(this)">
        <div class="month-header-left">
          <span class="month-toggle">▶</span>
          <span>${formattedMonth}</span>
        </div>
        <div class="month-header-right">KES ${monthTotal.toFixed(2)} • ${memberCount} contributors</div>
      </div>
      <div class="month-details">
        ${monthTithes.map((tithe) => {
          const member = members.find(m => m.membershipNumber === tithe.membershipNumber);
          const memberName = member ? member.name : 'Unknown Member';
          const date = new Date(tithe.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
          return `
            <div class="contribution-item">
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span class="member-search-name">${memberName}</span>
                <span class="contribution-item-date">${date}</span>
              </div>
              <span class="contribution-item-amount">KES ${parseFloat(tithe.amount).toFixed(2)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    monthGroupsContainer.appendChild(monthGroup);
  });
}

titheMemberSearch.addEventListener('input', (e) => {
  const query = e.target.value;
  
  if (!query.trim()) {
    titheMemberSearchResults.style.display = 'none';
    return;
  }
  
  const results = searchMembers(query);
  renderTitheMemberSearch(results, 'titheMemberSearchResults');
});

titheTabForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (currentUser && currentUser.role === 'member') {
    titheMessage.textContent = 'You do not have permission to record tithe.';
    setTimeout(() => { titheMessage.textContent = ''; }, 3000);
    return;
  }
  if (!hasPermission('canRecordTithe')) {
    titheMessage.textContent = 'You do not have permission to record tithe.';
    setTimeout(() => { titheMessage.textContent = ''; }, 3000);
    return;
  }

  const selectedMemberId = titheMember.value;
  const amount = document.getElementById('titheTabAmount').value.trim();
  const date = document.getElementById('titheTabDate').value;

  if (!selectedMemberId || !amount || !date) {
    titheMessage.textContent = 'Please fill in all fields.';
    setTimeout(() => { titheMessage.textContent = ''; }, 3000);
    return;
  }

  const members = getStoredMembers();
  const member = members.find((m) => m.membershipNumber === selectedMemberId);

  if (!member) {
    titheMessage.textContent = 'Member not found.';
    setTimeout(() => { titheMessage.textContent = ''; }, 3000);
    return;
  }

  const newTithe = {
    membershipNumber: selectedMemberId,
    amount,
    date,
  };

  const tithes = getStoredTithes();
  tithes.push(newTithe);
  saveTithes(tithes);
  renderTitheTab();
  updateDashboard();
  
  // Refresh member details if currently viewing
  if (currentSelectedMember && currentSelectedMember.membershipNumber === selectedMemberId) {
    showMemberDetails(currentSelectedMember);
  }

  titheTabForm.reset();
  titheMember.value = '';
  titheMessage.textContent = 'Tithe recorded successfully.';
  setTimeout(() => { titheMessage.textContent = ''; }, 3000);
});

document.getElementById('closeTitheForm').addEventListener('click', (e) => {
  e.preventDefault();
  titheTabForm.reset();
  titheMember.value = '';
  titheMemberSearchResults.style.display = 'none';
});

populateTitheMemberSelect();
renderTitheTab();

// Department Contribution Management
const DEPARTMENTS = ['men', 'ladies', 'youth', 'teens', 'sundayschool', 'intercessory', 'mission', 'praiseandworship', 'ushering'];
const departmentContributionForm = document.getElementById('departmentContributionForm');
const departmentMessage = document.getElementById('departmentMessage');
let currentOpenDepartment = null;

function getStoredDepartmentContributions() {
  const raw = localStorage.getItem(DEPARTMENT_CONTRIBUTION_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveDepartmentContributions(records) {
  localStorage.setItem(DEPARTMENT_CONTRIBUTION_STORAGE_KEY, JSON.stringify(records));
}

function getDepartmentBalance(department) {
  const records = getStoredDepartmentContributions();
  let balance = 0;
  records.forEach((record) => {
    if (record.department === department) {
      if (record.type === 'deposit') {
        balance += parseFloat(record.amount);
      } else if (record.type === 'withdraw') {
        balance -= parseFloat(record.amount);
      }
    }
  });
  return balance;
}

function getDepartmentLabelFromValue(value) {
  const labels = {
    'men': 'Men',
    'ladies': 'Ladies',
    'youth': 'Youth',
    'teens': 'Teens',
    'sundayschool': 'Sunday School',
    'intercessory': 'Intercessory',
    'mission': 'Mission',
    'praiseandworship': 'Praise and Worship',
    'ushering': 'Ushering'
  };
  return labels[value] || value;
}

function renderDepartmentBalances() {
  const balancesContainer = document.getElementById('departmentBalances');
  balancesContainer.innerHTML = '';

  const balanceGrid = document.createElement('div');
  balanceGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;';

  DEPARTMENTS.forEach((dept) => {
    const balance = getDepartmentBalance(dept);
    const balanceCard = document.createElement('div');
    balanceCard.style.cssText = 'padding: 12px; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s ease;';
    balanceCard.onmouseover = () => balanceCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    balanceCard.onmouseout = () => balanceCard.style.boxShadow = 'none';
    balanceCard.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${getDepartmentLabelFromValue(dept)}</div>
      <div style="font-size: 1.2rem; color: ${balance >= 0 ? 'var(--primary)' : '#ef4444'}; font-weight: 700;">KES ${balance.toFixed(2)}</div>
    `;
    balanceCard.addEventListener('click', () => showDepartmentTransactions(dept));
    balanceGrid.appendChild(balanceCard);
  });

  balancesContainer.appendChild(balanceGrid);
}

function showDepartmentTransactions(department) {
  // Toggle: if same department is clicked, close the panel
  if (currentOpenDepartment === department) {
    closeDepartmentDetail();
    currentOpenDepartment = null;
    return;
  }

  const records = getStoredDepartmentContributions().filter(r => r.department === department);
  const deptLabel = getDepartmentLabelFromValue(department);
  const balance = getDepartmentBalance(department);

  // Create or use existing detail panel
  let detailPanel = document.getElementById('departmentDetailPanel');
  if (!detailPanel) {
    detailPanel = document.createElement('div');
    detailPanel.id = 'departmentDetailPanel';
    detailPanel.style.cssText = 'position: fixed; right: -400px; top: 0; width: 400px; height: 100vh; background: white; border-left: 1px solid var(--border); box-shadow: -4px 0 12px rgba(0,0,0,0.1); overflow-y: auto; z-index: 500; transition: right 0.3s ease;';
    document.body.appendChild(detailPanel);
  }

  const contentHtml = `
    <div style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0;">${deptLabel}</h3>
      <button onclick="closeDepartmentDetail()" style="border: none; background: none; font-size: 1.5rem; cursor: pointer; padding: 0;">×</button>
    </div>
    <div style="padding: 20px; border-bottom: 2px solid var(--border); background: #f8fafc;">
      <div style="font-size: 0.9rem; color: var(--muted); margin-bottom: 4px;">Current Balance</div>
      <div style="font-size: 1.8rem; font-weight: 700; color: ${balance >= 0 ? 'var(--primary)' : '#ef4444'};">KES ${balance.toFixed(2)}</div>
    </div>
    <div style="padding: 20px;">
      ${records.length === 0 ? 
        `<p style="color: var(--muted); font-size: 0.9rem;">No transactions for this department.</p>` :
        `
        <h4 style="margin: 0 0 12px 0; color: var(--muted); font-size: 0.9rem;">All Transactions (${records.length})</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${records.sort((a, b) => new Date(b.date) - new Date(a.date)).map((record) => {
            const typeLabel = record.type === 'deposit' ? 'Deposit' : 'Withdraw';
            const typeColor = record.type === 'deposit' ? '#22c55e' : '#ef4444';
            const dateLabel = new Date(record.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
            return `
              <div style="padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 0.85rem; color: var(--muted);">${dateLabel}</span>
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; background: ${typeColor}20; color: ${typeColor};">${typeLabel}</span>
                </div>
                <div style="font-weight: 600; color: ${typeColor}; font-size: 0.95rem;">KES ${parseFloat(record.amount).toFixed(2)}</div>
                ${record.notes ? `<div style="font-size: 0.8rem; color: var(--muted); margin-top: 4px;">Note: ${record.notes}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        `
      }
    </div>
  `;

  detailPanel.innerHTML = contentHtml;
  detailPanel.style.right = '0';
  currentOpenDepartment = department;
}

function closeDepartmentDetail() {
  const detailPanel = document.getElementById('departmentDetailPanel');
  if (detailPanel) {
    detailPanel.style.right = '-400px';
    currentOpenDepartment = null;
  }
}

function renderDepartmentContributions() {
  const records = getStoredDepartmentContributions();
  const monthGroupsContainer = document.getElementById('departmentMonthGroups');
  monthGroupsContainer.innerHTML = '';

  if (records.length === 0) {
    monthGroupsContainer.innerHTML = '<p style="color: var(--muted); font-size: 0.95rem;">No department contribution records yet.</p>';
    renderDepartmentBalances();
    return;
  }

  // Group records by month/year
  const { grouped, sorted } = groupContributionsByMonth(records);

  sorted.forEach((yearMonth) => {
    const monthRecords = grouped[yearMonth];
    const formattedMonth = formatMonthYear(yearMonth);

    // Organize records by date
    const recordsByDate = {};
    monthRecords.forEach((record) => {
      if (!recordsByDate[record.date]) {
        recordsByDate[record.date] = [];
      }
      recordsByDate[record.date].push(record);
    });

    const sortedDates = Object.keys(recordsByDate).sort((a, b) => new Date(b) - new Date(a));

    const monthGroup = document.createElement('div');
    monthGroup.className = 'month-group';
    
    const monthTotal = monthRecords.reduce((sum, r) => {
      const amount = parseFloat(r.amount);
      return r.type === 'deposit' ? sum + amount : sum - amount;
    }, 0);

    monthGroup.innerHTML = `
      <div class="month-header" onclick="toggleMonth(this)">
        <div class="month-header-left">
          <span class="month-toggle">▶</span>
          <span>${formattedMonth}</span>
        </div>
        <div class="month-header-right">KES ${monthTotal.toFixed(2)}</div>
      </div>
      <div class="month-details">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Date</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Department</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Type</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Amount (KES)</th>
              <th style="text-align: left; padding: 10px; color: var(--muted); font-weight: 600; font-size: 0.9rem;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${sortedDates.map((date) => {
              const dateRecords = recordsByDate[date];
              const dateLabel = new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
              const dateTotal = dateRecords.reduce((sum, r) => {
                const amount = parseFloat(r.amount);
                return r.type === 'deposit' ? sum + amount : sum - amount;
              }, 0);

              return dateRecords.map((record, index) => {
                const typeLabel = record.type === 'deposit' ? 'Deposit' : 'Withdraw';
                const typeColor = record.type === 'deposit' ? '#22c55e' : '#ef4444';
                const deptLabel = getDepartmentLabelFromValue(record.department);

                return `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    ${index === 0 ? `<td rowspan="${dateRecords.length}" style="padding: 10px; color: var(--muted); font-size: 0.9rem; font-weight: 600;">${dateLabel}</td>` : ''}
                    <td style="padding: 10px;">${deptLabel}</td>
                    <td style="padding: 10px;"><span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; font-weight: 500; background: ${typeColor}20; color: ${typeColor};">${typeLabel}</span></td>
                    <td style="padding: 10px; font-weight: 600; color: ${typeColor};">KES ${parseFloat(record.amount).toFixed(2)}</td>
                    <td style="padding: 10px; color: var(--muted); font-size: 0.9rem;">${record.notes || '-'}</td>
                  </tr>
                `;
              }).join('');
            }).join('')}
            <tr style="border-top: 2px solid var(--border); background: #f8fafc; font-weight: 600; color: var(--primary);">
              <td colspan="4" style="padding: 10px; text-align: right;">TOTAL FOR ${formattedMonth.toUpperCase()}</td>
              <td style="padding: 10px; font-weight: 700;">KES ${monthTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    monthGroupsContainer.appendChild(monthGroup);
  });

  renderDepartmentBalances();
}

departmentContributionForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (currentUser && currentUser.role === 'member') {
    departmentMessage.textContent = 'You do not have permission to record department contributions.';
    setTimeout(() => { departmentMessage.textContent = ''; }, 3000);
    return;
  }
  if (!hasPermission('canRecordDepartment')) {
    departmentMessage.textContent = 'You do not have permission to record department contributions.';
    setTimeout(() => { departmentMessage.textContent = ''; }, 3000);
    return;
  }

  const department = document.getElementById('departmentName').value;
  const type = document.getElementById('transactionType').value;
  const date = document.getElementById('departmentDate').value;
  const amount = document.getElementById('departmentAmount').value.trim();
  const notes = document.getElementById('departmentNotes').value.trim();

  if (!department || !type || !date || !amount) {
    departmentMessage.textContent = 'Please fill in all required fields.';
    setTimeout(() => { departmentMessage.textContent = ''; }, 3000);
    return;
  }

  const newRecord = {
    department,
    type,
    date,
    amount: parseFloat(amount).toFixed(2),
    notes: notes || '',
  };

  const records = getStoredDepartmentContributions();
  records.push(newRecord);
  saveDepartmentContributions(records);
  renderDepartmentContributions();

  departmentContributionForm.reset();
  departmentMessage.textContent = 'Department contribution recorded successfully.';
  setTimeout(() => { departmentMessage.textContent = ''; }, 3000);
});

document.getElementById('closeDepartmentForm').addEventListener('click', (e) => {
  e.preventDefault();
  departmentContributionForm.reset();
});

function getAllAppData() {
  return {
    members: getStoredMembers(),
    inventory: getStoredInventory(),
    projectGiving: getStoredProjectGiving(),
    tithes: getStoredTithes(),
    attendance: getStoredAttendance(),
    welfare: getStoredWelfare(),
    churchGiving: getStoredChurchGiving(),
    departmentContributions: getStoredDepartmentContributions(),
    expenses: getStoredExpenses(),
    exportedAt: new Date().toISOString(),
  };
}

function restoreAllAppData(data) {
  if (Array.isArray(data.members)) saveMembers(data.members);
  if (Array.isArray(data.inventory)) saveInventory(data.inventory);
  if (Array.isArray(data.projectGiving)) saveProjectGiving(data.projectGiving);
  if (Array.isArray(data.tithes)) saveTithes(data.tithes);
  if (Array.isArray(data.attendance)) saveAttendance(data.attendance);
  if (Array.isArray(data.welfare)) saveWelfare(data.welfare);
  if (Array.isArray(data.churchGiving)) saveChurchGiving(data.churchGiving);
  if (Array.isArray(data.departmentContributions)) saveDepartmentContributions(data.departmentContributions);
  if (Array.isArray(data.expenses)) saveExpenses(data.expenses);
}

function hasAnyStoredData() {
  return (
    getStoredMembers().length > 0 ||
    getStoredInventory().length > 0 ||
    getStoredProjectGiving().length > 0 ||
    getStoredTithes().length > 0 ||
    getStoredAttendance().length > 0 ||
    getStoredWelfare().length > 0 ||
    getStoredChurchGiving().length > 0 ||
    getStoredDepartmentContributions().length > 0 ||
    getStoredExpenses().length > 0
  );
}

function saveBackupToLocalStorage(data) {
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(data));
}

function getStoredBackupData() {
  const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function tryAutoRestoreFromBackup() {
  if (hasAnyStoredData()) return;

  const backup = getStoredBackupData();
  if (!backup) return;

  restoreAllAppData(backup);
  renderMembers();
  renderInventory();
  renderProjectGiving();
  renderTitheTab();
  renderWelfare();
  renderExpenses();
  renderChurchGiving();
  renderAttendance();
  renderDepartmentContributions();
  updateDashboard();
  showBackupMessage('Restored data automatically from your last saved backup.');
}

function showBackupMessage(message, isError = false) {
  const backupMessage = document.getElementById('backupMessage');
  backupMessage.textContent = message;
  backupMessage.style.color = isError ? '#dc2626' : '';
  setTimeout(() => {
    backupMessage.textContent = '';
    backupMessage.style.color = '';
  }, 5000);
}

function parseDateToMonthLabel(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function groupByMonth(records, amountField = 'amount') {
  const grouped = {};
  records.forEach((record) => {
    const monthLabel = parseDateToMonthLabel(record.date);
    if (!grouped[monthLabel]) grouped[monthLabel] = 0;
    grouped[monthLabel] += parseFloat(record[amountField]) || 0;
  });
  return Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b)).map((month) => ({ month, total: grouped[month] }));
}

function getMemberDetails(membershipNumber) {
  const member = getStoredMembers().find((m) => m.membershipNumber === membershipNumber);
  return {
    name: member ? member.name : 'Unknown',
    phone: member ? member.phone : 'Unknown',
    group: member ? member.group : 'Unknown',
    membershipNumber,
  };
}

function getMemberName(membershipNumber) {
  return getMemberDetails(membershipNumber).name;
}

function buildReportWorkbook() {
  const workbook = XLSX.utils.book_new();

  const titheRecords = getStoredTithes();
  const titheSummary = groupByMonth(titheRecords).map((row) => ({ Month: row.month, TotalTithe: row.total.toFixed(2) }));
  const titheSheet = XLSX.utils.json_to_sheet(titheSummary);
  XLSX.utils.book_append_sheet(workbook, titheSheet, 'Tithes by Month');

  const expenseRecords = getStoredExpenses();
  const expenseSummary = groupByMonth(expenseRecords).map((row) => ({ Month: row.month, TotalExpense: row.total.toFixed(2) }));
  const expenseSheet = XLSX.utils.json_to_sheet(expenseSummary);
  XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses by Month');

  const members = getStoredMembers();
  const memberSheetData = [
    { Metric: 'Total Members', Value: members.length },
    {},
    { MembershipNumber: 'Membership No.', Name: 'Name', Gender: 'Gender', Group: 'Group', DateJoined: 'Date Joined' },
    ...members.map((member) => ({
      MembershipNumber: member.membershipNumber,
      Name: member.name,
      Gender: member.gender,
      Group: member.group,
      DateJoined: member.dateJoined,
    })),
  ];
  const memberSheet = XLSX.utils.json_to_sheet(memberSheetData, { skipHeader: true });
  XLSX.utils.book_append_sheet(workbook, memberSheet, 'Total Members');

  const welfareRecords = getStoredWelfare();
  const welfareSheetData = welfareRecords.map((record) => ({
    BeneficiaryName: record.beneficiaryName,
    BeneficiaryMembershipNumber: record.beneficiaryMembershipNumber,
    ContributorName: record.contributorName,
    ContributorMembershipNumber: record.contributorMembershipNumber,
    Amount: parseFloat(record.amount).toFixed(2),
    Date: record.date,
    Notes: record.notes || '',
  }));
  const welfareSheet = XLSX.utils.json_to_sheet(welfareSheetData);
  XLSX.utils.book_append_sheet(workbook, welfareSheet, 'Welfare Beneficiaries');

  const projectGivingRecords = getStoredProjectGiving();
  const projectSheetData = projectGivingRecords.map((record) => ({
    MembershipNumber: record.membershipNumber,
    MemberName: getMemberName(record.membershipNumber),
    ProjectName: record.projectName || record.project || '',
    Amount: parseFloat(record.amount).toFixed(2),
    Date: record.date,
    Notes: record.notes || '',
  }));
  const projectSheet = XLSX.utils.json_to_sheet(projectSheetData);
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Giving');

  return workbook;
}

function buildSingleSheetWorkbook(sheetData, sheetName) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return workbook;
}

function buildTitheWorkbook() {
  const titheRecords = getStoredTithes();
  const titheSheetData = titheRecords.map((record) => {
    const member = getMemberDetails(record.membershipNumber);
    return {
      Name: member.name,
      PhoneNumber: member.phone,
      Group: member.group,
      MembershipNumber: member.membershipNumber,
      Amount: parseFloat(record.amount).toFixed(2),
      Date: record.date,
    };
  });
  return buildSingleSheetWorkbook(titheSheetData, 'Tithe Details');
}

function buildExpenseWorkbook() {
  const expenseRecords = getStoredExpenses();
  const expenseSummary = groupByMonth(expenseRecords).map((row) => ({ Month: row.month, TotalExpense: row.total.toFixed(2) }));
  return buildSingleSheetWorkbook(expenseSummary, 'Expenses by Month');
}

function buildMembersWorkbook() {
  const members = getStoredMembers();
  const data = [
    { Metric: 'Total Members', Value: members.length },
    {},
    { MembershipNumber: 'Membership No.', Name: 'Name', PhoneNumber: 'Phone Number', Gender: 'Gender', Group: 'Group', DateJoined: 'Date Joined' },
    ...members.map((member) => ({
      MembershipNumber: member.membershipNumber,
      Name: member.name,
      PhoneNumber: member.phone,
      Gender: member.gender,
      Group: member.group,
      DateJoined: member.dateJoined,
    })),
  ];
  return buildSingleSheetWorkbook(data, 'Total Members');
}

function buildWelfareWorkbook() {
  const welfareRecords = getStoredWelfare();
  const welfareSheetData = welfareRecords.map((record) => {
    const contributor = getMemberDetails(record.contributorMembershipNumber);
    return {
      BeneficiaryName: record.beneficiaryName,
      BeneficiaryMembershipNumber: record.beneficiaryMembershipNumber,
      Name: contributor.name,
      PhoneNumber: contributor.phone,
      Group: contributor.group,
      MembershipNumber: contributor.membershipNumber,
      Amount: parseFloat(record.amount).toFixed(2),
      Date: record.date,
      Notes: record.notes || '',
    };
  });
  return buildSingleSheetWorkbook(welfareSheetData, 'Welfare Beneficiaries');
}

function buildProjectGivingWorkbook() {
  const projectGivingRecords = getStoredProjectGiving();
  const projectSheetData = projectGivingRecords.map((record) => {
    const member = getMemberDetails(record.membershipNumber);
    return {
      Name: member.name,
      PhoneNumber: member.phone,
      Group: member.group,
      MembershipNumber: member.membershipNumber,
      ProjectName: record.projectName || record.project || '',
      Amount: parseFloat(record.amount).toFixed(2),
      Date: record.date,
      Notes: record.notes || '',
    };
  });
  return buildSingleSheetWorkbook(projectSheetData, 'Project Giving');
}

const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const exportReportsBtn = document.getElementById('exportReportsBtn');
const exportTitheReportBtn = document.getElementById('exportTitheReportBtn');
const exportExpenseReportBtn = document.getElementById('exportExpenseReportBtn');
const exportMembersReportBtn = document.getElementById('exportMembersReportBtn');
const exportWelfareReportBtn = document.getElementById('exportWelfareReportBtn');
const exportProjectReportBtn = document.getElementById('exportProjectReportBtn');

exportDataBtn.addEventListener('click', () => {
  const data = getAllAppData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mizpah-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  saveBackupToLocalStorage(data);
  showBackupMessage('Backup exported successfully.');
});

exportReportsBtn.addEventListener('click', () => {
  try {
    const workbook = buildReportWorkbook();
    const fileName = `mizpah-reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showBackupMessage('Excel report exported successfully.');
  } catch (error) {
    console.error('Excel export error:', error);
    showBackupMessage('Failed to export Excel report.', true);
  }
});

exportTitheReportBtn.addEventListener('click', () => {
  const titheRecords = getStoredTithes();
  if (titheRecords.length === 0) {
    showBackupMessage('No tithe records to export.', true);
    return;
  }
  showMonthSelectionModal('tithe');
});

exportExpenseReportBtn.addEventListener('click', () => {
  const expenseRecords = getStoredExpenses();
  if (expenseRecords.length === 0) {
    showBackupMessage('No expense records to export.', true);
    return;
  }
  showMonthSelectionModal('expense');
});

exportMembersReportBtn.addEventListener('click', () => {
  try {
    const workbook = buildMembersWorkbook();
    const fileName = `mizpah-members-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showBackupMessage('Members report exported successfully.');
  } catch (error) {
    console.error('Excel export error:', error);
    showBackupMessage('Failed to export members report.', true);
  }
});

exportWelfareReportBtn.addEventListener('click', () => {
  const welfareRecords = getStoredWelfare();
  if (welfareRecords.length === 0) {
    showBackupMessage('No welfare records to export.', true);
    return;
  }
  showBeneficiarySelectionModal();
});

exportProjectReportBtn.addEventListener('click', () => {
  try {
    const workbook = buildProjectGivingWorkbook();
    const fileName = `mizpah-project-giving-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showBackupMessage('Project giving report exported successfully.');
  } catch (error) {
    console.error('Excel export error:', error);
    showBackupMessage('Failed to export project giving report.', true);
  }
});

importDataBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const importedData = JSON.parse(reader.result);
      restoreAllAppData(importedData);
      renderMembers();
      renderInventory();
      renderProjectGiving();
      renderTitheTab();
      renderWelfare();
      renderExpenses();
      renderChurchGiving();
      renderAttendance();
      renderDepartmentContributions();
      updateDashboard();
      saveBackupToLocalStorage(importedData);
      showBackupMessage('Data imported successfully. Your tabs are restored.');
    } catch (error) {
      showBackupMessage('Failed to import data. Please select a valid backup file.', true);
      console.error('Import error:', error);
    } finally {
      importFileInput.value = '';
    }
  };
  reader.readAsText(file);
});

// Helper functions for filtered exports
function getUniqueMonthsFromRecords(records) {
  const months = new Set();
  records.forEach((record) => {
    const monthLabel = parseDateToMonthLabel(record.date);
    months.add(monthLabel);
  });
  return Array.from(months).sort((a, b) => new Date(a) - new Date(b));
}

function getUniqueBeneficiariesFromWelfare() {
  const welfare = getStoredWelfare();
  const beneficiaries = new Map();
  welfare.forEach((record) => {
    if (!beneficiaries.has(record.beneficiaryMembershipNumber)) {
      beneficiaries.set(record.beneficiaryMembershipNumber, record.beneficiaryName);
    }
  });
  return Array.from(beneficiaries.entries()).sort((a, b) => a[1].localeCompare(b[1]));
}

function buildTitheWorkbookForMonth(selectedMonth) {
  const titheRecords = getStoredTithes().filter((record) => {
    return parseDateToMonthLabel(record.date) === selectedMonth;
  });
  const titheSheetData = titheRecords.map((record) => {
    const member = getMemberDetails(record.membershipNumber);
    return {
      Name: member.name,
      PhoneNumber: member.phone,
      Group: member.group,
      MembershipNumber: member.membershipNumber,
      Amount: parseFloat(record.amount).toFixed(2),
      Date: record.date,
    };
  });
  return buildSingleSheetWorkbook(titheSheetData, `Tithe - ${selectedMonth}`);
}

function buildExpenseWorkbookForMonth(selectedMonth) {
  const expenseRecords = getStoredExpenses().filter((record) => {
    return parseDateToMonthLabel(record.date) === selectedMonth;
  });
  const expenseSheetData = expenseRecords.map((record) => ({
    Description: record.description || '',
    Amount: parseFloat(record.amount).toFixed(2),
    Date: record.date,
    Notes: record.notes || '',
  }));
  return buildSingleSheetWorkbook(expenseSheetData, `Expenses - ${selectedMonth}`);
}

function buildWelfareWorkbookForBeneficiary(beneficiaryMembershipNumber) {
  const welfareRecords = getStoredWelfare().filter(
    (record) => record.beneficiaryMembershipNumber === beneficiaryMembershipNumber
  );
  const welfareSheetData = welfareRecords.map((record) => {
    const contributor = getMemberDetails(record.contributorMembershipNumber);
    return {
      BeneficiaryName: record.beneficiaryName,
      Name: contributor.name,
      PhoneNumber: contributor.phone,
      Group: contributor.group,
      MembershipNumber: contributor.membershipNumber,
      Amount: parseFloat(record.amount).toFixed(2),
      Date: record.date,
      Notes: record.notes || '',
    };
  });
  return buildSingleSheetWorkbook(welfareSheetData, `Welfare - ${welfareRecords[0]?.beneficiaryName || 'Unknown'}`);
}

function closeExportModals() {
  const monthModal = document.getElementById('monthSelectionModal');
  const beneficiaryModal = document.getElementById('beneficiarySelectionModal');
  if (monthModal) monthModal.style.display = 'none';
  if (beneficiaryModal) beneficiaryModal.style.display = 'none';
}

function setupExportModalCloseHandlers(modal) {
  const dialog = modal.querySelector('div');
  if (dialog) {
    dialog.onclick = (event) => {
      event.stopPropagation();
    };
  }
  modal.onclick = (event) => {
    if (event.target === modal) {
      closeExportModals();
    }
  };
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeExportModals();
  }
});

function showMonthSelectionModal(exportType) {
  const modal = document.getElementById('monthSelectionModal');
  const selector = document.getElementById('monthSelector');
  
  selector.innerHTML = '<option value="">-- Select a month --</option>';
  const months = exportType === 'tithe' ? getUniqueMonthsFromRecords(getStoredTithes()) : getUniqueMonthsFromRecords(getStoredExpenses());
  months.forEach((month) => {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = month;
    selector.appendChild(option);
  });
  
  modal.style.display = 'flex';
  setupExportModalCloseHandlers(modal);
  document.getElementById('confirmMonthBtn').onclick = () => {
    const selectedMonth = selector.value;
    if (!selectedMonth) {
      showBackupMessage('Please select a month.', true);
      return;
    }
    modal.style.display = 'none';
    try {
      const workbook = exportType === 'tithe' ? buildTitheWorkbookForMonth(selectedMonth) : buildExpenseWorkbookForMonth(selectedMonth);
      const fileName = `mizpah-${exportType}-${selectedMonth.replace(/ /g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showBackupMessage(`${exportType.charAt(0).toUpperCase() + exportType.slice(1)} report exported successfully.`);
    } catch (error) {
      console.error('Export error:', error);
      showBackupMessage('Failed to export report.', true);
    }
  };
  document.getElementById('cancelMonthBtn').onclick = () => {
    modal.style.display = 'none';
  };
}

function showBeneficiarySelectionModal() {
  const modal = document.getElementById('beneficiarySelectionModal');
  const selector = document.getElementById('beneficiarySelector');
  
  selector.innerHTML = '<option value="">-- Select a beneficiary --</option>';
  const beneficiaries = getUniqueBeneficiariesFromWelfare();
  beneficiaries.forEach(([membershipNumber, name]) => {
    const option = document.createElement('option');
    option.value = membershipNumber;
    option.textContent = name;
    selector.appendChild(option);
  });
  
  modal.style.display = 'flex';
  setupExportModalCloseHandlers(modal);
  document.getElementById('confirmBeneficiaryBtn').onclick = () => {
    const selectedBeneficiary = selector.value;
    if (!selectedBeneficiary) {
      showBackupMessage('Please select a beneficiary.', true);
      return;
    }
    modal.style.display = 'none';
    try {
      const workbook = buildWelfareWorkbookForBeneficiary(selectedBeneficiary);
      const beneficiaryName = selector.options[selector.selectedIndex].text;
      const fileName = `mizpah-welfare-${beneficiaryName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showBackupMessage('Welfare report exported successfully.');
    } catch (error) {
      console.error('Export error:', error);
      showBackupMessage('Failed to export welfare report.', true);
    }
  };
  document.getElementById('cancelBeneficiaryBtn').onclick = () => {
    modal.style.display = 'none';
  };
}

tryAutoRestoreFromBackup();
renderDepartmentContributions();

// ============ APP INITIALIZATION WITH ROLE-BASED ACCESS ============
// Initialize app with login screen visible
document.addEventListener('DOMContentLoaded', () => {
  // Ensure login screen is visible initially
  const loginScreen = document.getElementById('loginScreen');
  const appContainer = document.getElementById('appContainer');
  if (loginScreen && appContainer) {
    loginScreen.style.display = 'flex';
    appContainer.style.display = 'none';
  }
});
