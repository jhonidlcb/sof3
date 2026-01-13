
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import {
  DollarSign,
  Plus,
  Eye,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  FileText,
  Trash2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface Invoice {
  id: number;
  invoiceNumber: string;
  projectId: number;
  projectName: string;
  clientId: number;
  clientName: string;
  amount: string;
  totalAmount: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'pending_verification';
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  proofFileUrl?: string;
  paymentMethod?: string;
  sifenCDC?: string;
  sifenQR?: string;
  description?: string;
}

interface Project {
  id: number;
  name: string;
  clientId: number;
  clientName: string;
  price: string;
}

export default function InvoiceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingProof, setViewingProof] = useState<Invoice | null>(null);

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/admin/invoices"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/invoices");
      if (!response.ok) throw new Error('Error al cargar facturas');
      return await response.json();
    },
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/projects");
      if (!response.ok) throw new Error('Error al cargar proyectos');
      return await response.json();
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/invoices", data);
      if (!response.ok) throw new Error('Error al crear factura');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({ title: "Factura creada", description: "Se ha generado la factura correctamente." });
      setShowCreateDialog(false);
      setSelectedProject(null);
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest("PUT", `/api/admin/invoices/${id}`, data);
      if (!response.ok) throw new Error('Error al actualizar factura');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({ title: "Factura actualizada", description: "Cambios guardados correctamente." });
      setShowEditDialog(false);
    },
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/admin/invoices/${id}/approve`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Error al aprobar pago');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({ title: "Pago aprobado", description: "Factura SIFEN generada y enviada al cliente." });
      setShowProofDialog(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string, label: string }> = {
      paid: { color: "bg-green-100 text-green-800", label: "Pagado" },
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pendiente" },
      pending_verification: { color: "bg-orange-100 text-orange-800", label: "Verificando Pago" },
      overdue: { color: "bg-red-100 text-red-800", label: "Vencido" },
      cancelled: { color: "bg-gray-100 text-gray-800", label: "Cancelado" },
    };
    const config = configs[status] || { color: "bg-gray-100", label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Obtener tipo de cambio actual
  const { data: exchangeRate } = useQuery({
    queryKey: ["/api/exchange-rate"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/exchange-rate");
      if (!response.ok) throw new Error('Error al cargar tipo de cambio');
      return await response.json();
    },
  });

  const convertUsdToPyg = (usdAmount: string | number) => {
    const amount = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
    const rate = exchangeRate ? parseFloat(exchangeRate.usdToGuarani) : 7300;
    return Math.round(amount * rate);
  };

  const stats = {
    total: invoices?.length || 0,
    pending: invoices?.filter(i => i.status === 'pending').length || 0,
    paid: invoices?.filter(i => i.status === 'paid').length || 0,
    revenue: invoices?.reduce((sum, i) => i.status === 'paid' ? sum + parseFloat(i.totalAmount || "0") : sum, 0) || 0,
  };

  if (invoicesLoading || projectsLoading) {
    return <DashboardLayout title="Gestión de Facturas"><div className="p-8">Cargando...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Facturación Administrativa">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Facturas del Sistema</h1>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Factura
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Total Emitidas</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div><p className="text-xs text-muted-foreground">Pendientes</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{stats.paid}</div><p className="text-xs text-muted-foreground">Pagadas</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">Gs {stats.revenue.toLocaleString()}</div><p className="text-xs text-muted-foreground">Ingresos Totales (snapshot)</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Número / CDC</TableHead>
                  <TableHead>Cliente / Proyecto</TableHead>
                  <TableHead>Monto (PYG / USD)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      {invoice.sifenCDC && <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{invoice.sifenCDC}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{invoice.clientName}</div>
                      <div className="text-xs text-muted-foreground">{invoice.projectName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-lg text-primary">Gs {convertUsdToPyg(invoice.amount).toLocaleString('es-PY')}</div>
                      <div className="text-xs text-muted-foreground">${parseFloat(invoice.amount || "0").toLocaleString()} USD</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(invoice.status === 'pending_verification' || (invoice.status === 'pending' && invoice.proofFileUrl)) ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-blue-50 text-blue-700 border-blue-200" 
                            onClick={() => { 
                              setViewingProof(invoice); 
                              setShowProofDialog(true); 
                            }}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" /> Verificar Pago
                          </Button>
                        ) : (
                          invoice.status === 'pending' && (
                            <Button variant="outline" size="sm" onClick={() => approvePaymentMutation.mutate(invoice.id)} disabled={approvePaymentMutation.isPending}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                            </Button>
                          )
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => window.open(`/api/client/invoices/${invoice.id}/download`, '_blank')}
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Generar Nueva Factura</DialogTitle></DialogHeader>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              createInvoiceMutation.mutate({
                projectId: parseInt(fd.get('projectId') as string),
                description: fd.get('description'),
                amount: fd.get('amount'),
                dueDate: fd.get('dueDate')
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Proyecto / Cliente</Label>
                <Select name="projectId" required>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} - {p.clientName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Monto (USD)</Label><Input name="amount" type="number" step="0.01" required /></div>
              <div className="space-y-2"><Label>Descripción</Label><Input name="description" required /></div>
              <div className="space-y-2"><Label>Vencimiento</Label><Input name="dueDate" type="date" required /></div>
              <Button type="submit" className="w-full" disabled={createInvoiceMutation.isPending}>Crear</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Factura</DialogTitle></DialogHeader>
            {editingInvoice && (
              <form onSubmit={(e: any) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                updateInvoiceMutation.mutate({
                  id: editingInvoice.id,
                  description: fd.get('description'),
                  amount: fd.get('amount'),
                  dueDate: fd.get('dueDate')
                });
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Monto (USD)</Label>
                  <Input name="amount" type="number" step="0.01" defaultValue={editingInvoice.amount} required />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input name="description" defaultValue={editingInvoice.description} required />
                </div>
                <div className="space-y-2">
                  <Label>Vencimiento</Label>
                  <Input name="dueDate" type="date" defaultValue={editingInvoice.dueDate.split('T')[0]} required />
                </div>
                <Button type="submit" className="w-full" disabled={updateInvoiceMutation.isPending}>
                  {updateInvoiceMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Proof Dialog */}
        <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Verificar Comprobante de Pago</DialogTitle></DialogHeader>
            {viewingProof && (
              <div className="space-y-4">
                {(viewingProof.status === 'pending_verification' || viewingProof.proofFileUrl) && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                      <h5 className="font-bold text-yellow-800 text-lg">📄 Comprobante de Pago Recibido</h5>
                      <div className="ml-auto bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {viewingProof.status === 'paid' ? 'PAGADO' : 'PENDIENTE VERIFICACIÓN'}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-yellow-200 p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-yellow-600 uppercase tracking-wide font-medium">Factura</p>
                          <p className="text-sm font-bold text-yellow-900">{viewingProof.invoiceNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-yellow-600 uppercase tracking-wide font-medium">Monto</p>
                          <p className="text-lg font-bold text-green-700">Gs {convertUsdToPyg(viewingProof.amount).toLocaleString('es-PY')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-yellow-200 p-4 mb-4">
                      <h6 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                        💳 Detalles del Pago
                      </h6>
                      <div className="text-sm text-yellow-900">
                        <span className="font-medium">Método:</span> {viewingProof.paymentMethod || 'No especificado'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="aspect-video bg-muted rounded overflow-hidden flex items-center justify-center border">
                  {viewingProof.proofFileUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
                      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                        {viewingProof.proofFileUrl.toLowerCase().endsWith('.pdf') ? 
                          <iframe 
                            src={viewingProof.proofFileUrl.startsWith('http') ? viewingProof.proofFileUrl : (viewingProof.proofFileUrl.startsWith('/') ? viewingProof.proofFileUrl : `/${viewingProof.proofFileUrl}`)} 
                            className="w-full h-full" 
                            title="PDF Proof" 
                          /> :
                          <img 
                            src={viewingProof.proofFileUrl.startsWith('http') ? viewingProof.proofFileUrl : (viewingProof.proofFileUrl.startsWith('/') ? viewingProof.proofFileUrl : `/${viewingProof.proofFileUrl}`)} 
                            className="max-w-full max-h-full object-contain cursor-pointer" 
                            alt="Proof" 
                            onClick={() => {
                              const url = viewingProof.proofFileUrl!.startsWith('http') ? viewingProof.proofFileUrl! : (viewingProof.proofFileUrl!.startsWith('/') ? viewingProof.proofFileUrl! : `/${viewingProof.proofFileUrl}`);
                              window.open(url, '_blank');
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('attached_assets')) {
                                 const filename = viewingProof.proofFileUrl?.split(/[\\\/]/).pop();
                                 target.src = `/attached_assets/${filename}`;
                              }
                            }}
                          />
                        }
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => {
                          const url = viewingProof.proofFileUrl!.startsWith('http') ? viewingProof.proofFileUrl! : (viewingProof.proofFileUrl!.startsWith('/') ? viewingProof.proofFileUrl! : `/${viewingProof.proofFileUrl}`);
                          window.open(url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir comprobante en pantalla completa
                      </Button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 opacity-20" />
                      <p>No hay archivo adjunto</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-bold">Gs {convertUsdToPyg(viewingProof.amount).toLocaleString('es-PY')}</div>
                    <div className="text-sm text-muted-foreground">{viewingProof.paymentMethod || 'Método no especificado'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowProofDialog(false)}>Cerrar</Button>
                    {viewingProof.status !== 'paid' && (
                      <Button onClick={() => approvePaymentMutation.mutate(viewingProof.id)} disabled={approvePaymentMutation.isPending}>
                        {approvePaymentMutation.isPending ? "Procesando SIFEN..." : "Aprobar y Generar Factura"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
