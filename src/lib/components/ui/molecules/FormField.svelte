<script lang="ts">
  import Input from '$lib/components/ui/atoms/Input.svelte';
  import Slider from '$lib/components/ui/atoms/Slider.svelte';
  import Select from '$lib/components/ui/atoms/Select.svelte';
  import Toggle from '$lib/components/ui/atoms/Toggle.svelte';

  let {
    label,
    type = 'input',
    inputType = 'text',
    value,
    placeholder = '',
    min,
    max,
    step,
    options,
    disabled = false,
    required = false,
    error = '',
    help = '',
    unit = '',
    id,
    class: className = '',
    onInput,
    onChange,
    onBlur,
    onFocus,
    ...props
  }: {
    label?: string;
    type?: 'input' | 'slider' | 'select' | 'toggle';
    inputType?: 'text' | 'number' | 'email' | 'tel' | 'url';
    value?: string | number;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{ value: string | number; label: string }>;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    help?: string;
    unit?: string;
    id?: string;
    class?: string;
    onInput?: (value: string | number) => void;
    onChange?: (value: string | number) => void;
    onBlur?: (e: FocusEvent) => void;
    onFocus?: (e: FocusEvent) => void;
  } = $props();
</script>

<div class={`flex flex-col gap-1 ${className}`}>
  {#if label}
    <label class="text-sm font-medium text-textSecondary uppercase tracking-wider">
      {label}
      {#if required}
        <span class="text-danger ml-1" aria-hidden="true">*</span>
      {/if}
    </label>
  {/if}

  <div class="relative">
    {#if type === 'input'}
      <Input
        {label}
        {value}
        type={inputType}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={error}
        help={help}
        {id}
        onInput={(e) => {
          const target = e.currentTarget as HTMLInputElement;
          onInput?.(inputType === 'number' ? parseFloat(target.value) : target.value);
        }}
        onChange={(e) => {
          const target = e.currentTarget as HTMLInputElement;
          onChange?.(inputType === 'number' ? parseFloat(target.value) : target.value);
        }}
        onBlur={onBlur}
        onFocus={onFocus}
        {...props}
      />
    {:else if type === 'slider'}
      <Slider
        {label}
        value={value as number}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        help={help}
        {id}
        onInput={onInput as ((value: number) => void) | undefined}
        onChange={onChange as ((value: number) => void) | undefined}
        {...props}
      />
    {:else if type === 'select'}
      <Select
        {label}
        {value}
        options={options || []}
        disabled={disabled}
        required={required}
        error={error}
        help={help}
        {id}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        {...props}
      />
    {:else if type === 'toggle'}
      <Toggle
        {label}
        checked={value as unknown as boolean}
        disabled={disabled}
        {id}
        onChange={onChange as unknown as (checked: boolean) => void}
        {...props}
      />
    {/if}

    {#if unit}
      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-textMuted">
        {unit}
      </span>
    {/if}
  </div>
</div>
