// src/pages/Dashboard.tsx (key additions; assume rest is unchanged, e.g., sidebar, main content)
import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProfiles } from '@/hooks/use-profiles';
import { useToast } from '@/hooks/use-toast';

export function Dashboard() {
  const supabase = useSupabaseClient();
  const { profiles, currentProfileId, setCurrentProfileId, isLoading: profilesLoading } = useProfiles();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProfile, setNewProfile] = useState({
    full_name: '',
    role: 'relative' as 'astronaut' | 'relative',
    relationship: '',  // e.g., "child"
    mission_name: '',
  });

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profiles.length) return;

    const primaryProfile = profiles.find(p => p.is_primary);
    if (!primaryProfile) return;

    try {
      const { data: newProfileData, error } = await supabase
        .from('profiles')
        .insert({
          user_id: primaryProfile.user_id,
          full_name: newProfile.full_name,
          role: newProfile.role,
          relationship: newProfile.relationship,
          mission_name: newProfile.mission_name || null,
          is_primary: false,
          family_group_id: primaryProfile.family_group_id || primaryProfile.id,  // Link to family group
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Family profile created!' });
      setShowCreateDialog(false);
      setNewProfile({ full_name: '', role: 'relative', relationship: '', mission_name: '' });
      // Refetch profiles via query invalidation (React Query will handle)
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSwitchProfile = (profileId: string) => {
    setCurrentProfileId(profileId);
    // Update localStorage or session for persistence if needed
    localStorage.setItem('currentProfileId', profileId);
    toast({ title: `Switched to ${profiles.find(p => p.id === profileId)?.full_name}` });
  };

  // ... (rest of Dashboard unchanged, but pass currentProfileId to child components like ChatInterface, ConnectionsManager, MessagesCenter)

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r"> {/* Sidebar unchanged */} </aside>
      <main className="flex-1 p-4">
        {/* New: Profile Switcher */}
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p>Current Profile: {profiles.find(p => p.id === currentProfileId)?.full_name} ({profiles.find(p => p.id === currentProfileId)?.role})</p>
          </div>
          <div className="flex gap-2">
            <Select value={currentProfileId || ''} onValueChange={handleSwitchProfile} disabled={profilesLoading}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Switch Profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name} ({profile.role} {profile.relationship ? `- ${profile.relationship}` : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setShowCreateDialog(true)}>Add Family Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Family Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={newProfile.full_name}
                      onChange={(e) => setNewProfile({ ...newProfile, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newProfile.role} onValueChange={(value) => setNewProfile({ ...newProfile, role: value as 'astronaut' | 'relative' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="astronaut">Astronaut</SelectItem>
                        <SelectItem value="relative">Relative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="relationship">Relationship (e.g., child, spouse)</Label>
                    <Input
                      id="relationship"
                      value={newProfile.relationship}
                      onChange={(e