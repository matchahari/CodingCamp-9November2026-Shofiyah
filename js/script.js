// Kunci penyimpanan Local Storage
const STORAGE_KEYS = {
  TRANSACTIONS: "ebv_transactions",
  CATEGORIES: "ebv_categories",
  THEME: "ebv_theme",
};

// Kategori default sesuai brief
const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];

// Warna konsisten untuk kategori bawaan + palet untuk kategori kustom
const CATEGORY_COLORS = {
  Food: "#2ecc71",
  Transport: "#3498db",
  Fun: "#e67e22",
};

const EXTRA_PALETTE = [
  "#9b59b6",
  "#1abc9c",
  "#f1c40f",
  "#e84393",
  "#00cec9",
  "#fd79a8",
  "#6c5ce7",
];

// State aplikasi
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
let categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [...DEFAULT_CATEGORIES];
let currentSort = "latest";
let spendingChart = null;

// Referensi elemen DOM
const transactionForm = document.getElementById("transactionForm");
const itemNameInput = document.getElementById("itemName");
const itemAmountInput = document.getElementById("itemAmount");
const itemCategorySelect = document.getElementById("itemCategory");
const customCategoryInput = document.getElementById("customCategoryInput");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const formError = document.getElementById("formError");
const totalBalanceEl = document.getElementById("totalBalance");
const transactionListEl = document.getElementById("transactionList");
const sortSelect = document.getElementById("sortSelect");
const themeToggleBtn = document.getElementById("themeToggle");
const emptyChartText = document.getElementById("emptyChartText");
const chartCanvas = document.getElementById("spendingChart");

// Inisialisasi aplikasi saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderCategories();
  renderApp();
});

// ========================
// 1. DARK / LIGHT MODE
// ========================
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || "light";
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  themeToggleBtn.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

  if (spendingChart) {
    spendingChart.options.plugins.legend.labels.color =
      theme === "dark" ? "#f9fafb" : "#1f2937";
    spendingChart.update();
  }
}

themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

// ========================
// 2. KATEGORI & CUSTOM CATEGORY
// ========================
function renderCategories() {
  itemCategorySelect.innerHTML = "";
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    itemCategorySelect.appendChild(option);
  });
}

addCategoryBtn.addEventListener("click", () => {
  const rawName = customCategoryInput.value.trim();
  formError.textContent = "";

  if (!rawName) {
    formError.textContent = "Please enter a category name first.";
    return;
  }

  const formattedName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const exists = categories.some(
    (cat) => cat.toLowerCase() === formattedName.toLowerCase()
  );

  if (exists) {
    formError.textContent = `Category "${formattedName}" already exists.`;
    return;
  }

  categories.push(formattedName);
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  renderCategories();
  itemCategorySelect.value = formattedName;
  customCategoryInput.value = "";
});

// ========================
// 3. TAMBAH & HAPUS TRANSAKSI
// ========================
transactionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  formError.textContent = "";

  const name = itemNameInput.value.trim();
  const amount = parseFloat(itemAmountInput.value);
  const category = itemCategorySelect.value;

  // Validasi semua field
  if (!name || isNaN(amount) || amount <= 0 || !category) {
    formError.textContent =
      "Please fill in all fields with a valid item name, positive amount, and category.";
    return;
  }

  const newTransaction = {
    id: Date.now(),
    name,
    amount: Number(amount.toFixed(2)),
    category,
  };

  transactions.unshift(newTransaction);
  saveTransactions();
  renderApp();

  transactionForm.reset();
  itemCategorySelect.value = category;
});

function deleteTransaction(id) {
  transactions = transactions.filter((item) => item.id !== id);
  saveTransactions();
  renderApp();
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

// ========================
// 4. SORTING TRANSAKSI
// ========================
sortSelect.addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderTransactionList();
});

function getSortedTransactions() {
  const copy = [...transactions];
  switch (currentSort) {
    case "amount-desc":
      return copy.sort((a, b) => b.amount - a.amount);
    case "amount-asc":
      return copy.sort((a, b) => a.amount - b.amount);
    case "category":
      return copy.sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      );
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "latest":
    default:
      return copy;
  }
}

// ========================
// 5. RENDER UI & PIE CHART
// ========================
function renderApp() {
  updateTotalBalance();
  renderTransactionList();
  updateChart();
}

function updateTotalBalance() {
  const total = transactions.reduce((sum, item) => sum + item.amount, 0);
  totalBalanceEl.textContent = `$${total.toFixed(2)}`;
}

function renderTransactionList() {
  transactionListEl.innerHTML = "";

  if (transactions.length === 0) {
    transactionListEl.innerHTML =
      '<li class="empty-text">No transactions yet. Add your first expense above!</li>';
    return;
  }

  const sortedItems = getSortedTransactions();

  sortedItems.forEach((item) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    li.innerHTML = `
      <div class="item-details">
        <span class="item-name">${escapeHTML(item.name)}</span>
        <span class="item-amount">$${item.amount.toFixed(2)}</span>
        <span class="item-category">${escapeHTML(item.category)}</span>
      </div>
      <button type="button" class="delete-btn" data-id="${item.id}">Delete</button>
    `;

    li.querySelector(".delete-btn").addEventListener("click", () => {
      deleteTransaction(item.id);
    });

    transactionListEl.appendChild(li);
  });
}

function getCategoryColor(category, index) {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  return EXTRA_PALETTE[index % EXTRA_PALETTE.length];
}

function updateChart() {
  if (transactions.length === 0) {
    chartCanvas.style.display = "none";
    emptyChartText.style.display = "block";
    if (spendingChart) {
      spendingChart.destroy();
      spendingChart = null;
    }
    return;
  }

  chartCanvas.style.display = "block";
  emptyChartText.style.display = "none";

  // Hitung total pengeluaran per kategori
  const totalsByCategory = {};
  transactions.forEach((item) => {
    totalsByCategory[item.category] =
      (totalsByCategory[item.category] || 0) + item.amount;
  });

  const labels = Object.keys(totalsByCategory);
  const dataValues = Object.values(totalsByCategory);
  const backgroundColors = labels.map((cat, idx) => getCategoryColor(cat, idx));
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  if (spendingChart) {
    spendingChart.data.labels = labels;
    spendingChart.data.datasets[0].data = dataValues;
    spendingChart.data.datasets[0].backgroundColor = backgroundColors;
    spendingChart.update();
    return;
  }

  spendingChart = new Chart(chartCanvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: dataValues,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: isDark ? "#1f2937" : "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: isDark ? "#f9fafb" : "#1f2937",
            padding: 16,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || "";
              const value = context.parsed || 0;
              return ` ${label}: $${value.toFixed(2)}`;
            },
          },
        },
      },
    },
  });
}

// Mencegah XSS dari input teks pengguna
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}