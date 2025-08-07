import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { SessionWithRelations, Location } from '../../../server/src/schema';

interface SessionManagerProps {
  sessions: SessionWithRelations[];
  locations: Location[];
  onCreateSession: (locationId: number, sessionName: string) => Promise<any>;
  onSelectSession: (session: SessionWithRelations) => void;
  isLoading: boolean;
}

export function SessionManager({ 
  sessions, 
  locations, 
  onCreateSession, 
  onSelectSession, 
  isLoading 
}: SessionManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [sessionName, setSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLocationId || !sessionName.trim()) {
      setError('Please select a location and enter a session name');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      await onCreateSession(parseInt(selectedLocationId), sessionName.trim());
      
      // Reset form and close dialog
      setSelectedLocationId('');
      setSessionName('');
      setIsCreateDialogOpen(false);
    } catch (err) {
      setError('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeSessions = sessions.filter((s: SessionWithRelations) => s.status === 'active');
  const completedSessions = sessions.filter((s: SessionWithRelations) => s.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Create new session */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle>🚀 Start New Session</CardTitle>
              <CardDescription>
                Create a new stock opname session for counting inventory
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  + New Session
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Stock Opname Session</DialogTitle>
                  <DialogDescription>
                    Set up a new session to start counting inventory items
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSession} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location: Location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name} ({location.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionName">Session Name</Label>
                    <Input
                      id="sessionName"
                      placeholder="e.g., Morning Count - Warehouse A"
                      value={sessionName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSessionName(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreating}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isCreating}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isCreating ? 'Creating...' : 'Create Session'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔄 Active Sessions</CardTitle>
            <CardDescription>
              Sessions currently in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session: SessionWithRelations) => (
                <div 
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors space-y-2 sm:space-y-0"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{session.session_name}</h3>
                    <p className="text-sm text-gray-600">
                      📍 {session.location.name} ({session.location.code})
                    </p>
                    <p className="text-xs text-gray-400">
                      Started: {session.started_at.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      Items: {session.items.length}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getSessionStatusColor(session.status)}>
                      {session.status.toUpperCase()}
                    </Badge>
                    <Button 
                      onClick={() => onSelectSession(session)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Continue →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed sessions */}
      <Card>
        <CardHeader>
          <CardTitle>✅ Recent Sessions</CardTitle>
          <CardDescription>
            Previously completed stock opname sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No completed sessions yet.</p>
              <p>Create your first session above to get started!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {completedSessions.map((session: SessionWithRelations) => (
                <div 
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{session.session_name}</h4>
                    <p className="text-sm text-gray-600">
                      📍 {session.location.name} • Items: {session.items.length}
                    </p>
                    <p className="text-xs text-gray-400">
                      Completed: {session.completed_at?.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getSessionStatusColor(session.status)}>
                      {session.status.toUpperCase()}
                    </Badge>
                    <Button 
                      onClick={() => onSelectSession(session)}
                      variant="outline"
                      size="sm"
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}