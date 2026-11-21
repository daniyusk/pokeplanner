import { Search } from 'lucide-react';
import type { ItemData } from '@/domain/types';

interface HeldItemPickerProps {
  hasHeldItems: boolean;
  selectedItem: ItemData | undefined;
  itemQuery: string;
  onChangeItemQuery: (query: string) => void;
  filteredItems: readonly ItemData[];
  onSelectItem: (slug: string) => void;
  onRemoveItem: () => void;
}

export function HeldItemPicker({
  hasHeldItems,
  selectedItem,
  itemQuery,
  onChangeItemQuery,
  filteredItems,
  onSelectItem,
  onRemoveItem,
}: HeldItemPickerProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--ink-secondary)]">Held Item</span>
        {selectedItem && (
          <button
            type="button"
            onClick={onRemoveItem}
            className="text-xs font-medium text-red-500 hover:underline"
          >
            Remove ({selectedItem.name})
          </button>
        )}
      </div>

      {hasHeldItems ? (
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={itemQuery}
              onChange={(e) => onChangeItemQuery(e.target.value)}
              placeholder={
                selectedItem
                  ? `Equipped: ${selectedItem.name}`
                  : 'Search held item (e.g., Leftovers, Air Balloon)...'
              }
              aria-label="Search held item"
              className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] pr-3 pl-8 text-xs text-[var(--ink-primary)]"
            />
          </div>
          {itemQuery.trim().length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1">
              {filteredItems.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => onSelectItem(item.slug)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-[var(--surface-muted)]"
                >
                  <span className="font-semibold text-[var(--ink-primary)]">{item.name}</span>
                  <span className="truncate text-[var(--ink-muted)]">{item.shortDesc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--ink-muted)]">
          Held items were introduced in Generation 2.
        </p>
      )}
    </div>
  );
}
