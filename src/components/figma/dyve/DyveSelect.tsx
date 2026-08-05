import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

type DyveSelectOption = {
  value: string;
  label: string;
};

interface DyveSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: DyveSelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

interface DyveComboboxProps extends DyveSelectProps {
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

const triggerBaseClassName =
  "h-12 rounded-2xl border-hairline bg-surface-soft px-4 text-left text-sm text-ink shadow-sm focus-visible:ring-2 focus-visible:ring-ring/40";

export function DyveSelect({
  value,
  onValueChange,
  options,
  placeholder = "선택하세요",
  triggerClassName,
  contentClassName,
}: DyveSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(triggerBaseClassName, triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className={cn("rounded-2xl border-hairline bg-canvas p-1 shadow-xl", contentClassName)}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-xl px-3 py-2 text-sm text-ink"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DyveCombobox({
  value,
  onValueChange,
  options,
  placeholder = "선택하세요",
  searchPlaceholder = "검색",
  emptyMessage = "결과가 없습니다.",
  triggerClassName,
  disabled = false,
}: DyveComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            triggerBaseClassName,
            "justify-between border-hairline bg-surface-soft font-normal hover:bg-surface-muted hover:text-ink",
            !selectedOption && "text-[var(--color-muted)]",
            triggerClassName,
          )}
        >
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-hairline bg-canvas p-0 shadow-2xl">
        <Command className="rounded-2xl bg-canvas">
          <CommandInput placeholder={searchPlaceholder} className="text-sm" />
          <CommandList className="max-h-64">
            <CommandEmpty className="py-6 text-sm text-[var(--color-muted)]">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="rounded-xl px-3 py-2 text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 size-4 text-primary transition-opacity",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type { DyveSelectOption };
