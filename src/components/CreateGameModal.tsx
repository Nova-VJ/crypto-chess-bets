import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Clock, Swords } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGame?: (stake: number, currency: string, timeControl: string) => void;
}

const CreateGameModal = ({ open, onOpenChange, onCreateGame }: CreateGameModalProps) => {
  const [stake, setStake] = useState('0.01');
  const [currency, setCurrency] = useState('ETH');
  const [timeControl, setTimeControl] = useState('10+0');

  const handleCreate = () => {
    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      toast.error('Por favor ingresa una cantidad válida');
      return;
    }

    onCreateGame?.(stakeAmount, currency, timeControl);
    toast.success('Partida creada. Esperando oponente...');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-serif">
            <Swords className="w-6 h-6 text-primary" />
            Crear Nueva Partida
          </DialogTitle>
          <DialogDescription>
            Configura los parámetros de tu partida y la apuesta
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 py-4"
        >
          {/* Stake Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              Cantidad a apostar
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0.01"
                step="0.001"
                min="0"
                className="flex-1 bg-secondary border-border"
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-24 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="MATIC">MATIC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              El ganador recibirá el 95% del total (5% fee del protocolo)
            </p>
          </div>

          {/* Time Control */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Control de tiempo
            </Label>
            <Select value={timeControl} onValueChange={setTimeControl}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1+0">Bullet 1 min</SelectItem>
                <SelectItem value="3+0">Blitz 3 min</SelectItem>
                <SelectItem value="5+0">Blitz 5 min</SelectItem>
                <SelectItem value="10+0">Rápida 10 min</SelectItem>
                <SelectItem value="15+10">Rápida 15+10</SelectItem>
                <SelectItem value="30+0">Clásica 30 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="glass-card p-4 space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Resumen</h4>
            <div className="flex justify-between">
              <span>Tu apuesta:</span>
              <span className="font-semibold text-primary">
                {stake} {currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Posible ganancia:</span>
              <span className="font-semibold text-success">
                {(parseFloat(stake || '0') * 1.9).toFixed(4)} {currency}
              </span>
            </div>
          </div>

          <Button onClick={handleCreate} className="w-full btn-primary-glow bg-primary">
            Crear Partida
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGameModal;
