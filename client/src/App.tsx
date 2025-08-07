import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, Location, SessionWithRelations, StockOpnameItem } from '../../server/src/schema';
import { LoginForm } from '@/components/LoginForm';
import { SessionManager } from '@/components/SessionManager';
import { ItemScanner } from '@/components/ItemScanner';
import { ReportGenerator } from '@/components/ReportGenerator';
import { SignatureCapture } from '@/components/SignatureCapture';

function App() {
  // Auth state
  const [user, setUser] = useState<Omit<User, 'password_hash'> | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // App state
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessions, setSessions] = useState<SessionWithRelations[]>([]);
  const [activeSession, setActiveSession] = useState<SessionWithRelations | null>(null);
  const [sessionItems, setSessionItems] = useState<StockOpnameItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load locations on mount
  const loadLocations = useCallback(async () => {
    try {
      const result = await trpc.getLocations.query();
      setLocations(result);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  }, []);

  // Load user sessions
  const loadUserSessions = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const result = await trpc.getUserSessions.query({ userId: user.id });
      setSessions(result);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load session items
  const loadSessionItems = useCallback(async (sessionId: number) => {
    try {
      const result = await trpc.getSessionItems.query({ session_id: sessionId });
      setSessionItems(result);
    } catch (error) {
      console.error('Failed to load session items:', error);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadUserSessions();
  }, [loadUserSessions]);

  useEffect(() => {
    if (activeSession) {
      loadSessionItems(activeSession.id);
    }
  }, [activeSession, loadSessionItems]);

  const handleLogin = async (username: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const result = await trpc.login.mutate({ username, password });
      setUser(result);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCreateSession = async (locationId: number, sessionName: string) => {
    if (!user) return;
    try {
      const newSession = await trpc.createStockOpnameSession.mutate({
        location_id: locationId,
        user_id: user.id,
        session_name: sessionName
      });
      await loadUserSessions(); // Refresh sessions list
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  };

  const handleAddItem = async (sessionId: number, sku: string, lotNumber: string, quantity: number, barcodeData: string) => {
    try {
      await trpc.addStockOpnameItem.mutate({
        session_id: sessionId,
        sku,
        lot_number: lotNumber,
        quantity,
        barcode_data: barcodeData
      });
      await loadSessionItems(sessionId); // Refresh items list
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  };

  const handleCompleteSession = async (sessionId: number, signatureData: string | null) => {
    try {
      await trpc.updateStockOpnameSession.mutate({
        id: sessionId,
        status: 'completed',
        signature_data: signatureData,
        completed_at: new Date()
      });
      await loadUserSessions(); // Refresh sessions list
      setActiveSession(null);
    } catch (error) {
      console.error('Failed to complete session:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveSession(null);
    setSessions([]);
    setSessionItems([]);
  };

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-900">📦 Stock Opname</CardTitle>
            <CardDescription>Inventory Management System</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm 
              onLogin={handleLogin} 
              isLoading={isAuthenticating}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900">📦 Stock Opname</h1>
              {activeSession && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hidden sm:inline-flex">
                  {activeSession.session_name}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
              <div className="text-left sm:text-right">
                <p className="font-medium text-gray-900 text-sm sm:text-base">{user.full_name}</p>
                <p className="text-xs sm:text-sm text-gray-500">{user.username}</p>
              </div>
              <Button variant="outline" onClick={handleLogout} size="sm" className="active:scale-95 transition-transform duration-75">
                Logout
              </Button>
            </div>
            {activeSession && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 sm:hidden self-start">
                {activeSession.session_name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-6">
        {activeSession ? (
          // Active session view
          <div className="space-y-6">
            {/* Session header */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div>
                    <CardTitle className="text-lg">{activeSession.session_name}</CardTitle>
                    <CardDescription>
                      📍 {activeSession.location.name} ({activeSession.location.code})
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveSession(null)}
                    >
                      Back to Sessions
                    </Button>
                    <Badge 
                      variant={activeSession.status === 'active' ? 'default' : 'secondary'}
                      className={
                        activeSession.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {activeSession.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Main content tabs */}
            <Tabs defaultValue="scan" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="scan">📱 Scan Items</TabsTrigger>
                <TabsTrigger value="items">📋 Items ({sessionItems.length})</TabsTrigger>
                <TabsTrigger value="complete">✅ Complete</TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4">
                <ItemScanner
                  onAddItem={(sku: string, lotNumber: string, quantity: number, barcodeData: string) =>
                    handleAddItem(activeSession.id, sku, lotNumber, quantity, barcodeData)
                  }
                />
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Scanned Items</CardTitle>
                    <CardDescription>
                      Total items: {sessionItems.length}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sessionItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No items scanned yet.</p>
                        <p>Switch to the Scan tab to start adding items.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                        {sessionItems.map((item: StockOpnameItem) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div className="flex-1">
                              <p className="font-medium">SKU: {item.sku}</p>
                              <p className="text-sm text-gray-600">
                                Lot: {item.lot_number} • Qty: {item.quantity}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.scanned_at.toLocaleString()}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {item.quantity} pcs
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="complete" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>📝 Complete Session</CardTitle>
                      <CardDescription>
                        Sign and finalize this stock opname session
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm space-y-2">
                        <p><strong>Session:</strong> {activeSession.session_name}</p>
                        <p><strong>Location:</strong> {activeSession.location.name}</p>
                        <p><strong>Items Scanned:</strong> {sessionItems.length}</p>
                        <p><strong>Started:</strong> {activeSession.started_at.toLocaleString()}</p>
                      </div>
                      <Separator />
                      <SignatureCapture
                        onComplete={(signatureData: string | null) => 
                          handleCompleteSession(activeSession.id, signatureData)
                        }
                        isLoading={isLoading}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>📊 Generate Reports</CardTitle>
                      <CardDescription>
                        Download Excel or PDF reports of this session
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ReportGenerator
                        sessionId={activeSession.id}
                        itemCount={sessionItems.length}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          // Sessions overview
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome, {user.full_name}! 👋</CardTitle>
                <CardDescription>
                  Manage your stock opname sessions from here
                </CardDescription>
              </CardHeader>
            </Card>

            <SessionManager
              sessions={sessions}
              locations={locations}
              onCreateSession={handleCreateSession}
              onSelectSession={setActiveSession}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;