'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical,
  Shield,
  ShieldOff,
  Mail,
  Trash2,
  Key,
} from 'lucide-react';

interface UserActionButtonsProps {
  user: {
    id: string;
    email: string;
    name?: string;
    is_admin: number;
  };
}

export function UserActionButtons({ user }: UserActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const handleToggleAdmin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_admin: user.is_admin === 1 ? 0 : 1,
        }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      router.refresh();
      setShowRoleDialog(false);
    } catch (error) {
      alert('Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to send reset email');

      alert('Password reset email sent successfully');
    } catch (error) {
      alert('Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');

      router.push('/admin/users');
      router.refresh();
    } catch (error) {
      alert('Failed to delete user');
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4 mr-2" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>User Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setShowRoleDialog(true)}>
            {user.is_admin === 1 ? (
              <>
                <ShieldOff className="h-4 w-4 mr-2" />
                Remove Admin
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Make Admin
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleSendPasswordReset}>
            <Key className="h-4 w-4 mr-2" />
            Send Password Reset
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.open(`mailto:${user.email}`, '_blank')}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email User
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role Change Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.is_admin === 1 ? 'Remove Admin Access' : 'Grant Admin Access'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.is_admin === 1
                ? `Remove admin privileges from ${user.name || user.email}? They will become a regular user.`
                : `Grant admin privileges to ${user.name || user.email}? They will have full access to admin features.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleAdmin} disabled={loading}>
              {loading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {user.name || user.email}? This action
              cannot be undone. All of their farms, progress, and data will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
