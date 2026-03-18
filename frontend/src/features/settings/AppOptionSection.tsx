import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/api/queryKeys';
import { settingsApi } from '@/api/settings';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, type TableColumn } from '@/components/ui/Table';
import { getApiErrorMessage } from '@/lib/http';
import type { AppOption } from '@/types/api';

import { APP_OPTION_CATEGORIES } from './constants';

interface AppOptionSectionProps {
  canUpdate: boolean;
  canDelete: boolean;
}

const CATEGORY_LABELS: Map<string, string> = new Map(
  APP_OPTION_CATEGORIES.map((item) => [item.value, item.label]),
);

function resolveCategoryLabel(category: string) {
  return CATEGORY_LABELS.get(category) ?? category;
}

export function AppOptionSection({ canUpdate, canDelete }: AppOptionSectionProps) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>(APP_OPTION_CATEGORIES[0]?.value ?? 'gender');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const optionsQuery = useQuery({
    queryKey: queryKeys.settings.options(),
    queryFn: () => settingsApi.options(),
  });

  const groupedOptions = useMemo(() => {
    const grouped = new Map<string, AppOption[]>();

    for (const option of optionsQuery.data ?? []) {
      const list = grouped.get(option.category) ?? [];
      list.push(option);
      grouped.set(option.category, list);
    }

    return Array.from(grouped.entries())
      .map(([groupCategory, options]) => ({
        category: groupCategory,
        categoryLabel: resolveCategoryLabel(groupCategory),
        options: [...options].sort(
          (left, right) =>
            left.sort_order - right.sort_order ||
            left.label.localeCompare(right.label) ||
            left.code.localeCompare(right.code),
        ),
      }))
      .sort((left, right) => left.categoryLabel.localeCompare(right.categoryLabel));
  }, [optionsQuery.data]);

  const createMutation = useMutation({
    mutationFn: () =>
      settingsApi.createOption({
        category,
        code: code.trim(),
        label: label.trim(),
        sort_order: Number(sortOrder),
      }),
    onSuccess: () => {
      toast.success('Option created');
      setCode('');
      setLabel('');
      setSortOrder('0');
      queryClient.invalidateQueries({ queryKey: ['settings', 'options'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create option'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => settingsApi.deactivateOption(id),
    onSuccess: () => {
      toast.success('Option deactivated');
      queryClient.invalidateQueries({ queryKey: ['settings', 'options'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.dashboard });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to deactivate option'));
    },
  });

  const columns: Array<TableColumn<AppOption>> = [
    {
      header: 'Label',
      render: (option) => option.label,
    },
    {
      header: 'Code',
      render: (option) => option.code,
    },
    {
      header: 'Sort',
      render: (option) => option.sort_order,
    },
    {
      header: 'Status',
      render: (option) => (
        <Badge variant={option.is_active ? 'success' : 'danger'}>
          {option.is_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      render: (option) => (
        <div className="actions-inline">
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={!canDelete || !option.is_active}
            isLoading={deactivateMutation.isPending && deactivateMutation.variables === option.id}
            onClick={() => deactivateMutation.mutate(option.id)}
          >
            Deactivate
          </Button>
        </div>
      ),
    },
  ];

  const submitCreateOption = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!code.trim() || !label.trim()) {
      toast.error('Code and label are required');
      return;
    }

    const numericSortOrder = Number(sortOrder);
    if (!Number.isInteger(numericSortOrder) || numericSortOrder < 0) {
      toast.error('Sort order must be a non-negative integer');
      return;
    }

    createMutation.mutate();
  };

  return (
    <div className="stack">
      <h3>App Options</h3>
      <p className="help-text">Manage dropdown values used by forms across the application.</p>

      {canUpdate ? (
        <form className="settings-form-grid" onSubmit={submitCreateOption}>
          <div className="field">
            <label>Category</label>
            <select
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={createMutation.isPending}
            >
              {APP_OPTION_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="e.g. weekly"
            disabled={createMutation.isPending}
          />
          <Input
            label="Label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Weekly"
            disabled={createMutation.isPending}
          />
          <Input
            label="Sort Order"
            type="number"
            min={0}
            step={1}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            disabled={createMutation.isPending}
          />

          <div className="actions-row settings-form-actions">
            <Button type="submit" isLoading={createMutation.isPending}>
              Add Option
            </Button>
          </div>
        </form>
      ) : (
        <p className="help-text">You do not have permission to add options.</p>
      )}

      {optionsQuery.isLoading ? <p>Loading options...</p> : null}
      {optionsQuery.isError ? <p>Failed to load options.</p> : null}

      {!optionsQuery.isLoading && !optionsQuery.isError ? (
        groupedOptions.length > 0 ? (
          <div className="stack">
            {groupedOptions.map((group) => (
              <section key={group.category} className="stack settings-group-block">
                <div className="settings-group-header">
                  <h4>{group.categoryLabel}</h4>
                  <p className="help-text">{group.options.length} options</p>
                </div>
                <Table
                  columns={columns}
                  data={group.options}
                  getRowKey={(option) => option.id}
                  emptyMessage="No options in this category."
                />
              </section>
            ))}
          </div>
        ) : (
          <p>No options found.</p>
        )
      ) : null}
    </div>
  );
}
