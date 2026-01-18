<script lang="ts">
  import BottomSheet from './BottomSheet.svelte';

  let {
    isOpen = $bindable(false),
    title = 'Confirm Action',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDanger = false,
    onConfirm,
    onCancel
  }: {
    isOpen?: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();

  function handleConfirm() {
    onConfirm();
    isOpen = false;
  }

  function handleCancel() {
    onCancel();
    isOpen = false;
  }
</script>

<BottomSheet bind:isOpen {title} onClose={handleCancel} height="auto">
  <div class="space-y-6 pb-4">
    <p class="text-textMain text-base leading-relaxed">{message}</p>

    <!-- Action buttons in thumb-reach zone -->
    <div class="flex gap-3 pt-2">
      <button
        type="button"
        onclick={handleCancel}
        class="flex-1 px-4 py-3.5 bg-bgInput text-textMain rounded-xl border border-white/5
          hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
          transition-all duration-200 font-medium text-base"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onclick={handleConfirm}
        class="flex-1 px-4 py-3.5 rounded-xl font-medium text-base text-white
          {isDanger ? 'bg-danger hover:bg-red-600' : 'bg-gradient-main bg-[length:200%_200%] animate-gradient-shift hover:shadow-glow-sm'}
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
          transition-all duration-200"
      >
        {confirmLabel}
      </button>
    </div>
  </div>
</BottomSheet>
