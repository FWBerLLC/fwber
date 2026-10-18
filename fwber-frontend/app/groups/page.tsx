'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GroupCard } from '@/components/GroupCard';
import { useAuth } from '@/lib/auth-context';
import { useGroups, useMyGroups } from '@/lib/hooks/use-groups';

export default function GroupsPage() {
  const { isAuthenticated } = useAuth();
  const { data: groupsData, isLoading: isLoadingGroups } = useGroups();
  const { data: myGroupsData, isLoading: isLoadingMyGroups } = useMyGroups();
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('');

  const groups = groupsData?.data || [];
  const myGroups = myGroupsData?.data || [];

  const filteredGroups = groups.filter((group) => {
    const groupName = group.name || '';
    const groupDesc = group.description || '';
    const searchQuery = search.toLowerCase();

    const matchesSearch = groupName.toLowerCase().includes(searchQuery) ||
    groupDesc.toLowerCase().includes(searchQuery) ||
    (Array.isArray(group.tags) && group.tags.some(tag => tag && tag.toLowerCase().includes(searchQuery)));

    const matchesCategory = selectedCategory ? group.category === selectedCategory : true;

    return matchesSearch && matchesCategory;
  });

  const myGroupIds = new Set((Array.isArray(myGroups) ? myGroups : []).map(g => g.id));
  
  const categories = Array.from(new Set((Array.isArray(groups) ? groups : []).map(g => g.category).filter(Boolean)));

  if (isLoadingGroups || isLoadingMyGroups) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background">
        {isAuthenticated && <AppHeader title="Groups" />}
        <div className="p-8 text-center">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      {isAuthenticated && <AppHeader title="Groups" />}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Groups</h1>
          <Link href="/groups/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <Input
            placeholder="Search groups by name, description, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md flex-1"
          />
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[200px]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category as string} value={category as string} className="capitalize">
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups?.map(group => (
            <GroupCard
              key={group.id}
              group={{
                ...group,
                is_member: myGroupIds.has(group.id)
              }}
            />
          ))}
        </div>

        {filteredGroups?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No groups found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
