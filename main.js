// ============================================
// GLOBAL VARIABLES
// ============================================
let allProducts = [];           // All products from API
let filteredProducts = [];      // Products after search filter
let currentPage = 1;            // Current pagination page
let pageSize = 10;              // Items per page
let sortColumn = null;          // Current sort column
let sortDirection = 'asc';      // Current sort direction
const API_BASE = 'https://api.escuelajs.co/api/v1/products';

// ============================================
// 1. LOAD & DISPLAY DATA
// ============================================
async function loadProducts() {
    showLoading(true);
    try {
        const response = await fetch(API_BASE);
        if (!response.ok) throw new Error('Failed to fetch products');
        
        allProducts = await response.json();
        filteredProducts = [...allProducts];
        
        // Apply current sort if any
        if (sortColumn) {
            sortProducts(sortColumn, sortDirection);
        }
        
        updateDisplay();
        updateStatistics();
        showLoading(false);
    } catch (error) {
        showLoading(false);
        showAlert('Error loading products: ' + error.message, 'danger');
    }
}

function updateDisplay() {
    renderTable();
    renderPagination();
    initializeTooltips();
}

function renderTable() {
    const tbody = document.getElementById('productTableBody');
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageProducts = filteredProducts.slice(start, end);

    if (pageProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-secondary">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = pageProducts.map(product => {
        const categoryClass = getCategoryClass(product.category?.name);
        const imageUrl = Array.isArray(product.images) && product.images.length > 0 
            ? cleanImageUrl(product.images[0])
            : 'https://via.placeholder.com/50';

        return `
            <tr data-bs-toggle="tooltip" 
                data-bs-placement="top" 
                data-bs-title="${escapeHtml(product.description || 'No description')}">
                <td>#${product.id}</td>
                <td>${escapeHtml(product.title)}</td>
                <td>$${parseFloat(product.price).toFixed(2)}</td>
                <td><span class="category-badge ${categoryClass}">${escapeHtml(product.category?.name || 'N/A')}</span></td>
                <td><img src="${imageUrl}" alt="${escapeHtml(product.title)}" class="product-image"></td>
                <td>
                    <button class="action-btn" onclick="viewProduct(${product.id})" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// 2. DESCRIPTION ON HOVER (TOOLTIPS)
// ============================================
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(el => {
        // Dispose existing tooltip if any
        const existingTooltip = bootstrap.Tooltip.getInstance(el);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
        // Create new tooltip
        new bootstrap.Tooltip(el);
    });
}

// ============================================
// 3. SEARCH (REAL-TIME)
// ============================================
function initSearch() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredProducts = [...allProducts];
        } else {
            filteredProducts = allProducts.filter(product =>
                product.title.toLowerCase().includes(searchTerm)
            );
        }

        // Reset to first page after search
        currentPage = 1;
        
        // Re-apply sorting
        if (sortColumn) {
            sortProducts(sortColumn, sortDirection);
        }
        
        updateDisplay();
    });
}

// ============================================
// 4. PAGINATION
// ============================================
function initPagination() {
    document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        updateDisplay();
    });
}

function renderPagination() {
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / pageSize);
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(start + pageSize - 1, totalProducts);

    // Update info text
    document.getElementById('paginationInfo').textContent = 
        `Showing ${totalProducts > 0 ? start : 0} to ${end} of ${totalProducts} products`;

    // Update pagination controls
    const controls = document.getElementById('paginationControls');
    let html = '';

    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;

    controls.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    updateDisplay();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// 5. SORTING
// ============================================
function initSorting() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            
            // Toggle direction if same column, otherwise default to asc
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }

            // Update sort icons
            document.querySelectorAll('.sortable .sort-icon').forEach(icon => {
                icon.className = 'bi bi-chevron-expand sort-icon';
            });

            const icon = header.querySelector('.sort-icon');
            icon.className = sortDirection === 'asc' 
                ? 'bi bi-chevron-up sort-icon' 
                : 'bi bi-chevron-down sort-icon';

            // Apply sorting
            sortProducts(column, sortDirection);
            currentPage = 1;
            updateDisplay();
        });
    });
}

function sortProducts(column, direction) {
    filteredProducts.sort((a, b) => {
        let aVal, bVal;

        if (column === 'title') {
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
        } else if (column === 'price') {
            aVal = parseFloat(a.price);
            bVal = parseFloat(b.price);
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// ============================================
// 6. EXPORT CSV
// ============================================
function initExportCSV() {
    document.getElementById('exportCsvBtn').addEventListener('click', () => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageProducts = filteredProducts.slice(start, end);

        if (pageProducts.length === 0) {
            showAlert('No products to export', 'warning');
            return;
        }

        // Create CSV content
        const headers = ['ID', 'Title', 'Price', 'Category', 'Image'];
        const rows = pageProducts.map(product => [
            product.id,
            `"${(product.title || '').replace(/"/g, '""')}"`,
            product.price,
            `"${(product.category?.name || '').replace(/"/g, '""')}"`,
            Array.isArray(product.images) && product.images.length > 0 
                ? `"${cleanImageUrl(product.images[0])}"` 
                : '""'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `products_page${currentPage}_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert('CSV exported successfully!', 'success');
    });
}

// ============================================
// 7. VIEW DETAIL MODAL
// ============================================
async function viewProduct(productId) {
    try {
        const response = await fetch(`${API_BASE}/${productId}`);
        if (!response.ok) throw new Error('Failed to fetch product details');
        
        const product = await response.json();

        // Populate view mode
        document.getElementById('viewProductImage').src = 
            Array.isArray(product.images) && product.images.length > 0 
                ? cleanImageUrl(product.images[0])
                : 'https://via.placeholder.com/400';
        document.getElementById('viewProductTitle').textContent = product.title;
        document.getElementById('viewProductPrice').textContent = `$${parseFloat(product.price).toFixed(2)}`;
        document.getElementById('viewProductCategory').textContent = product.category?.name || 'N/A';
        document.getElementById('viewProductDescription').textContent = product.description || 'No description available';

        // Store product ID for editing
        document.getElementById('editProductId').value = product.id;

        // Reset to view mode
        showViewMode();

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('productModal'));
        modal.show();
    } catch (error) {
        showAlert('Error loading product details: ' + error.message, 'danger');
    }
}

// ============================================
// 8. EDIT PRODUCT
// ============================================
function initEditProduct() {
    document.getElementById('editBtn').addEventListener('click', async () => {
        const productId = document.getElementById('editProductId').value;
        
        try {
            const response = await fetch(`${API_BASE}/${productId}`);
            if (!response.ok) throw new Error('Failed to fetch product details');
            
            const product = await response.json();

            // Populate edit form
            document.getElementById('editTitle').value = product.title;
            document.getElementById('editPrice').value = product.price;
            document.getElementById('editDescription').value = product.description || '';
            document.getElementById('editCategoryId').value = product.category?.id || 1;
            document.getElementById('editImages').value = 
                Array.isArray(product.images) ? product.images.join(', ') : '';

            // Switch to edit mode
            showEditMode();
        } catch (error) {
            showAlert('Error loading product for editing: ' + error.message, 'danger');
        }
    });

    document.getElementById('saveBtn').addEventListener('click', async () => {
        const form = document.getElementById('editProductForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const productId = document.getElementById('editProductId').value;
        const saveBtn = document.getElementById('saveBtn');
        
        // Disable button during API call
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            const images = document.getElementById('editImages').value
                .split(',')
                .map(img => img.trim())
                .filter(img => img);

            const data = {
                title: document.getElementById('editTitle').value,
                price: parseFloat(document.getElementById('editPrice').value),
                description: document.getElementById('editDescription').value,
                categoryId: parseInt(document.getElementById('editCategoryId').value),
                images: images
            };

            const response = await fetch(`${API_BASE}/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to update product');

            const updatedProduct = await response.json();
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
            
            // Reload products
            await loadProducts();
            
            showAlert('Product updated successfully!', 'success');
        } catch (error) {
            showAlert('Error updating product: ' + error.message, 'danger');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        }
    });

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        showViewMode();
    });
}

function showViewMode() {
    document.getElementById('viewMode').style.display = 'block';
    document.getElementById('editMode').style.display = 'none';
    document.getElementById('editBtn').style.display = 'inline-block';
    document.getElementById('saveBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('modalTitle').textContent = 'Product Details';
}

function showEditMode() {
    document.getElementById('viewMode').style.display = 'none';
    document.getElementById('editMode').style.display = 'block';
    document.getElementById('editBtn').style.display = 'none';
    document.getElementById('saveBtn').style.display = 'inline-block';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    document.getElementById('modalTitle').textContent = 'Edit Product';
}

// ============================================
// 9. CREATE PRODUCT
// ============================================
function initCreateProduct() {
    document.getElementById('createProductBtn').addEventListener('click', () => {
        // Reset form
        document.getElementById('createProductForm').reset();
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('createModal'));
        modal.show();
    });

    document.getElementById('createSubmitBtn').addEventListener('click', async () => {
        const form = document.getElementById('createProductForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitBtn = document.getElementById('createSubmitBtn');
        
        // Disable button during API call
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';

        try {
            const images = document.getElementById('createImages').value
                .split(',')
                .map(img => img.trim())
                .filter(img => img);

            const data = {
                title: document.getElementById('createTitle').value,
                price: parseFloat(document.getElementById('createPrice').value),
                description: document.getElementById('createDescription').value,
                categoryId: parseInt(document.getElementById('createCategoryId').value),
                images: images
            };

            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to create product');

            const newProduct = await response.json();
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('createModal')).hide();
            
            // Reload products
            await loadProducts();
            
            showAlert('Product created successfully!', 'success');
        } catch (error) {
            showAlert('Error creating product: ' + error.message, 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Product';
        }
    });
}

// ============================================
// 10. UX DETAILS (Loading, Alerts, etc.)
// ============================================
function showLoading(show) {
    document.getElementById('loadingSpinner').classList.toggle('active', show);
    document.getElementById('tableContainer').style.display = show ? 'none' : 'block';
    document.getElementById('paginationSection').style.display = show ? 'none' : 'flex';
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function updateStatistics() {
    // Calculate total value
    const totalValue = allProducts.reduce((sum, product) => sum + parseFloat(product.price), 0);
    document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;

    // Total units (mock data - API doesn't provide stock info)
    document.getElementById('inStock').textContent = `${allProducts.length} Units`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getCategoryClass(categoryName) {
    if (!categoryName) return '';
    const lower = categoryName.toLowerCase();
    if (lower.includes('cloth') || lower.includes('shirt') || lower.includes('wear')) return 'badge-clothes';
    if (lower.includes('electron') || lower.includes('headphone') || lower.includes('keyboard')) return 'badge-electronics';
    if (lower.includes('access') || lower.includes('wallet') || lower.includes('bag')) return 'badge-accessories';
    if (lower.includes('home') || lower.includes('furniture') || lower.includes('lamp')) return 'badge-home';
    return 'badge-clothes';
}

function cleanImageUrl(url) {
    // Remove brackets and quotes that sometimes appear in API responses
    return url.replace(/[\[\]"]/g, '').trim();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all event listeners
    initSearch();
    initPagination();
    initSorting();
    initExportCSV();
    initEditProduct();
    initCreateProduct();
    
    // Load products
    loadProducts();
});
