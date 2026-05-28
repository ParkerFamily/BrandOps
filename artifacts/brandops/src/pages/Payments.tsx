import { useListPayments, useCreatePayment, useUpdatePayment, useGetPayment, getListPaymentsQueryKey, getGetPaymentQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function Payments() {
  const { data: payments, isLoading } = useListPayments();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const { data: selectedPayment, isLoading: selectedLoading } = useGetPayment(selectedPaymentId || 0, {
    query: { enabled: !!selectedPaymentId, queryKey: getGetPaymentQueryKey(selectedPaymentId || 0) }
  });

  const handleMockCreatePayment = () => {
    createPayment.mutate({
      data: {
        submissionId: 1,
        creatorId: 1,
        campaignId: 1,
        amount: 250
      }
    }, {
      onSuccess: () => {
        toast({ title: "Mock payment created" });
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      }
    });
  };

  const handleProcessPayment = (id: number) => {
    updatePayment.mutate({
      id,
      data: { status: "processing" }
    }, {
      onSuccess: () => {
        toast({ title: "Payment marked as processing" });
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        if (selectedPaymentId === id) {
          queryClient.invalidateQueries({ queryKey: getGetPaymentQueryKey(id) });
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "paid": return <Badge className="bg-primary/20 text-primary border-primary/30">Paid</Badge>;
      case "processing": return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Processing</Badge>;
      case "pending": return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track payouts to creators for approved content.</p>
        </div>
        <Button onClick={handleMockCreatePayment} disabled={createPayment.isPending} variant="outline">
          Generate Mock Payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Processing</p>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${payments?.filter(p => p.status === 'processing').reduce((sum, p) => sum + p.amount, 0).toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <CreditCard className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0).toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-card-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
               {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(payment => (
                  <TableRow key={payment.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-muted-foreground">
                      {format(new Date(payment.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{payment.creator?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{payment.creator?.handle}</div>
                    </TableCell>
                    <TableCell>{payment.campaign?.title || 'Unknown'}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right font-bold">${payment.amount}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedPaymentId(payment.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {payment.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => handleProcessPayment(payment.id)}>
                          Process
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>No payments recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPaymentId} onOpenChange={(open) => !open && setSelectedPaymentId(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-card-border">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : selectedPayment ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-3xl font-bold">${selectedPayment.amount}</div>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Creator</div>
                    <div className="font-medium">{selectedPayment.creator?.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedPayment.creator?.email}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Campaign</div>
                    <div className="font-medium">{selectedPayment.campaign?.title}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Created At</div>
                    <div className="text-sm">{format(new Date(selectedPayment.createdAt), "MMM d, yyyy h:mm a")}</div>
                  </div>
                  {selectedPayment.paidAt && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Paid At</div>
                      <div className="text-sm">{format(new Date(selectedPayment.paidAt), "MMM d, yyyy h:mm a")}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>Payment not found</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}