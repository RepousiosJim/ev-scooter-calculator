<script lang="ts">
  let { message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void } = $props();
</script>

<div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
  <div class="bg-bgCard rounded-xl p-6 max-w-sm w-full mx-4 border border-white/10">
    <p class="text-textMain mb-6">{message}</p>
    <div class="flex gap-3">
      <button
        type="button"
        onclick={onCancel}
        class="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-textMain hover:bg-bgInput"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={onConfirm}
        class="flex-1 px-4 py-2 rounded-lg bg-danger text-white hover:bg-red-600"
      >
        Confirm
      </button>
    </div>
  </div>
</div>
