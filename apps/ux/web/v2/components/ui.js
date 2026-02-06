/**
 * OneOhm Design System - UI Component Library
 * JavaScript API for interactive components
 * 
 * Usage:
 * <script src="components/ui.js"></script>
 * <script>
 *   OneOhmUI.toast.success('Operation completed!');
 *   OneOhmUI.modal.confirm({ title: 'Confirm', message: 'Are you sure?' });
 * </script>
 */

const OneOhmUI = (function() {
    'use strict';

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    const toast = {
        container: null,

        init() {
            if (this.container) return;
            this.container = document.createElement('div');
            this.container.id = 'oneohm-toast-container';
            this.container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3';
            document.body.appendChild(this.container);
        },

        show(message, type = 'info', duration = 4000) {
            this.init();
            
            const icons = {
                success: '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
                error: '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
                warning: '<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
                info: '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            };

            const toast = document.createElement('div');
            toast.className = 'flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-200 min-w-[300px] max-w-[400px] transform translate-x-full transition-transform duration-300';
            toast.innerHTML = `
                ${icons[type] || icons.info}
                <p class="flex-1 text-sm text-gray-700">${message}</p>
                <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            `;

            this.container.appendChild(toast);
            
            // Animate in
            requestAnimationFrame(() => {
                toast.classList.remove('translate-x-full');
            });

            // Auto dismiss
            if (duration > 0) {
                setTimeout(() => {
                    toast.classList.add('translate-x-full');
                    setTimeout(() => toast.remove(), 300);
                }, duration);
            }

            return toast;
        },

        success(message, duration) { return this.show(message, 'success', duration); },
        error(message, duration) { return this.show(message, 'error', duration); },
        warning(message, duration) { return this.show(message, 'warning', duration); },
        info(message, duration) { return this.show(message, 'info', duration); }
    };


    // ============================================
    // MODAL DIALOGS
    // ============================================
    const modal = {
        show(options = {}) {
            const {
                title = 'Modal',
                message = '',
                content = '',
                type = 'default',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                showCancel = true,
                onConfirm = () => {},
                onCancel = () => {}
            } = options;

            const icons = {
                success: '<div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></div>',
                error: '<div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4"><svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></div>',
                warning: '<div class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4"><svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>',
                info: '<div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4"><svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>',
                default: ''
            };

            const buttonColors = {
                success: 'bg-green-600 hover:bg-green-700',
                error: 'bg-red-600 hover:bg-red-700',
                warning: 'bg-amber-600 hover:bg-amber-700',
                info: 'bg-blue-600 hover:bg-blue-700',
                default: 'bg-primary hover:bg-primary-dark'
            };

            const backdrop = document.createElement('div');
            backdrop.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4 opacity-0 transition-opacity duration-200';
            
            backdrop.innerHTML = `
                <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform scale-95 transition-transform duration-200">
                    <div class="text-center">
                        ${icons[type] || icons.default}
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
                        ${message ? `<p class="text-sm text-gray-600 mb-6">${message}</p>` : ''}
                        ${content}
                    </div>
                    <div class="flex gap-3 mt-6 ${showCancel ? '' : 'justify-center'}">
                        ${showCancel ? `<button class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors" data-action="cancel">${cancelText}</button>` : ''}
                        <button class="flex-1 px-4 py-2.5 ${buttonColors[type] || buttonColors.default} text-white rounded-lg text-sm font-medium transition-colors" data-action="confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(backdrop);
            document.body.style.overflow = 'hidden';

            // Animate in
            requestAnimationFrame(() => {
                backdrop.classList.remove('opacity-0');
                backdrop.querySelector('.bg-white').classList.remove('scale-95');
            });

            const close = (action) => {
                backdrop.classList.add('opacity-0');
                backdrop.querySelector('.bg-white').classList.add('scale-95');
                setTimeout(() => {
                    backdrop.remove();
                    document.body.style.overflow = '';
                }, 200);
                if (action === 'confirm') onConfirm();
                else onCancel();
            };

            backdrop.querySelector('[data-action="confirm"]').addEventListener('click', () => close('confirm'));
            if (showCancel) {
                backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => close('cancel'));
            }
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) close('cancel');
            });

            return { close };
        },

        confirm(options) {
            return new Promise((resolve) => {
                this.show({
                    type: 'warning',
                    ...options,
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false)
                });
            });
        },

        alert(options) {
            return this.show({
                ...options,
                showCancel: false,
                confirmText: options.confirmText || 'OK'
            });
        },

        success(options) {
            return this.show({ type: 'success', ...options });
        },

        error(options) {
            return this.show({ type: 'error', ...options });
        }
    };


    // ============================================
    // DROPDOWN MENUS
    // ============================================
    const dropdown = {
        init() {
            document.addEventListener('click', (e) => {
                const trigger = e.target.closest('[data-dropdown-trigger]');
                
                if (trigger) {
                    const menu = trigger.nextElementSibling;
                    if (menu && menu.hasAttribute('data-dropdown-menu')) {
                        const isOpen = !menu.classList.contains('hidden');
                        this.closeAll();
                        if (!isOpen) {
                            menu.classList.remove('hidden');
                        }
                    }
                } else if (!e.target.closest('[data-dropdown-menu]')) {
                    this.closeAll();
                }
            });
        },

        closeAll() {
            document.querySelectorAll('[data-dropdown-menu]').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    };


    // ============================================
    // ACCORDION
    // ============================================
    const accordion = {
        init() {
            document.addEventListener('click', (e) => {
                const trigger = e.target.closest('[data-accordion-trigger]');
                if (!trigger) return;

                const item = trigger.closest('[data-accordion-item]');
                const content = item.querySelector('[data-accordion-content]');
                const icon = trigger.querySelector('[data-accordion-icon]');
                const accordion = trigger.closest('[data-accordion]');
                const isSingle = accordion && accordion.dataset.accordion === 'single';

                if (isSingle) {
                    accordion.querySelectorAll('[data-accordion-item]').forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.querySelector('[data-accordion-content]')?.classList.add('hidden');
                            otherItem.querySelector('[data-accordion-icon]')?.classList.remove('rotate-180');
                        }
                    });
                }

                content.classList.toggle('hidden');
                icon?.classList.toggle('rotate-180');
            });
        }
    };


    // ============================================
    // TABS
    // ============================================
    const tabs = {
        init() {
            document.addEventListener('click', (e) => {
                const tab = e.target.closest('[data-tab]');
                if (!tab) return;

                const tabGroup = tab.closest('[data-tabs]');
                const tabId = tab.dataset.tab;

                // Update tab buttons
                tabGroup.querySelectorAll('[data-tab]').forEach(t => {
                    t.classList.remove('text-primary', 'border-primary');
                    t.classList.add('text-gray-500', 'border-transparent');
                });
                tab.classList.remove('text-gray-500', 'border-transparent');
                tab.classList.add('text-primary', 'border-primary');

                // Update tab panels
                const panelContainer = document.querySelector(`[data-tab-panels="${tabGroup.dataset.tabs}"]`);
                if (panelContainer) {
                    panelContainer.querySelectorAll('[data-tab-panel]').forEach(panel => {
                        panel.classList.add('hidden');
                    });
                    panelContainer.querySelector(`[data-tab-panel="${tabId}"]`)?.classList.remove('hidden');
                }
            });
        }
    };


    // ============================================
    // LOADING STATES
    // ============================================
    const loading = {
        spinner(size = 'md') {
            const sizes = {
                sm: 'w-4 h-4 border-2',
                md: 'w-6 h-6 border-2',
                lg: 'w-8 h-8 border-3',
                xl: 'w-12 h-12 border-4'
            };
            return `<div class="${sizes[size]} border-gray-200 border-t-primary rounded-full animate-spin"></div>`;
        },

        button(button, loading = true) {
            if (loading) {
                button.disabled = true;
                button.dataset.originalText = button.innerHTML;
                button.innerHTML = `
                    <span class="flex items-center gap-2">
                        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Loading...
                    </span>
                `;
            } else {
                button.disabled = false;
                button.innerHTML = button.dataset.originalText || 'Submit';
            }
        },

        overlay(container, show = true) {
            let overlay = container.querySelector('.loading-overlay');
            
            if (show) {
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'loading-overlay absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10';
                    overlay.innerHTML = this.spinner('lg');
                    container.style.position = 'relative';
                    container.appendChild(overlay);
                }
            } else if (overlay) {
                overlay.remove();
            }
        }
    };


    // ============================================
    // TOOLTIPS
    // ============================================
    const tooltip = {
        init() {
            document.querySelectorAll('[data-tooltip]').forEach(el => {
                const tip = document.createElement('div');
                tip.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible transition-all duration-200 z-50';
                tip.textContent = el.dataset.tooltip;
                
                el.style.position = 'relative';
                el.appendChild(tip);

                el.addEventListener('mouseenter', () => {
                    tip.classList.remove('opacity-0', 'invisible');
                });
                el.addEventListener('mouseleave', () => {
                    tip.classList.add('opacity-0', 'invisible');
                });
            });
        }
    };


    // ============================================
    // INITIALIZE
    // ============================================
    function init() {
        dropdown.init();
        accordion.init();
        tabs.init();
        tooltip.init();
        console.log('OneOhm UI initialized');
    }

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }


    // ============================================
    // PUBLIC API
    // ============================================
    return {
        toast,
        modal,
        dropdown,
        accordion,
        tabs,
        loading,
        tooltip,
        init
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OneOhmUI;
}
