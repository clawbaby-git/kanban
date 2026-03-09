export function createStatsPanelController() {
    const panel = document.getElementById('statsPanel');
    const handle = document.getElementById('statsDragHandle');
    const state = {
        active: false,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        panelWidth: 0,
        panelHeight: 0,
        pointerId: null
    };

    function startDrag(event) {
        if (!panel) {
            return;
        }

        const rect = panel.getBoundingClientRect();
        state.active = true;
        state.pointerId = event.pointerId;
        state.startX = event.clientX;
        state.startY = event.clientY;
        state.offsetX = rect.left;
        state.offsetY = rect.top;
        state.panelWidth = rect.width;
        state.panelHeight = rect.height;

        panel.setPointerCapture?.(event.pointerId);
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.right = 'auto';
        panel.style.transform = 'none';
        panel.style.zIndex = '200';
        panel.classList.add('dragging');
        document.body.style.userSelect = 'none';
    }

    function moveDrag(event) {
        if (!state.active || !panel) {
            return;
        }

        const deltaX = event.clientX - state.startX;
        const deltaY = event.clientY - state.startY;
        const maxLeft = Math.max(10, window.innerWidth - state.panelWidth - 10);
        const maxTop = Math.max(10, window.innerHeight - state.panelHeight - 10);
        panel.style.left = `${Math.min(maxLeft, Math.max(10, state.offsetX + deltaX))}px`;
        panel.style.top = `${Math.min(maxTop, Math.max(10, state.offsetY + deltaY))}px`;
    }

    function endDrag(event) {
        if (!state.active) {
            return;
        }

        state.active = false;
        state.pointerId = null;
        if (panel) {
            panel.releasePointerCapture?.(event.pointerId);
            panel.style.zIndex = '150';
            panel.classList.remove('dragging');
        }
        document.body.style.userSelect = '';
    }

    function init() {
        if (!handle) {
            return;
        }

        handle.addEventListener('pointerdown', startDrag);
        window.addEventListener('pointermove', moveDrag);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
    }

    return { init };
}
