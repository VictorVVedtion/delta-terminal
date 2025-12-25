'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface OrderFormProps {
  symbol: string
  currentPrice: number
  balance: number
}

export function OrderForm({ symbol, currentPrice, balance }: OrderFormProps) {
  const [orderType, setOrderType] = React.useState<'market' | 'limit'>('market')
  const [side, setSide] = React.useState<'buy' | 'sell'>('buy')
  const [price, setPrice] = React.useState(currentPrice.toString())
  const [amount, setAmount] = React.useState('')
  const [total, setTotal] = React.useState('')

  React.useEffect(() => {
    setPrice(currentPrice.toString())
  }, [currentPrice])

  const handleAmountChange = (value: string) => {
    setAmount(value)
    const numAmount = parseFloat(value) || 0
    const numPrice = parseFloat(price) || 0
    setTotal((numAmount * numPrice).toFixed(2))
  }

  const handleTotalChange = (value: string) => {
    setTotal(value)
    const numTotal = parseFloat(value) || 0
    const numPrice = parseFloat(price) || 0
    if (numPrice > 0) {
      setAmount((numTotal / numPrice).toFixed(6))
    }
  }

  const handlePercentClick = (percent: number) => {
    const maxAmount = balance / (parseFloat(price) || 1)
    const newAmount = (maxAmount * percent) / 100
    handleAmountChange(newAmount.toFixed(6))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Order submitted:', { orderType, side, price, amount, total })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>下单</CardTitle>
          <Badge variant="outline">{symbol}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Type Tabs */}
          <Tabs defaultValue="buy" value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                买入
              </TabsTrigger>
              <TabsTrigger value="sell" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                卖出
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Market/Limit Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={orderType === 'market' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrderType('market')}
              className="flex-1"
            >
              市价
            </Button>
            <Button
              type="button"
              variant={orderType === 'limit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOrderType('limit')}
              className="flex-1"
            >
              限价
            </Button>
          </div>

          {/* Price Input (只在限价单显示) */}
          {orderType === 'limit' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">价格</label>
              <div className="relative">
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                  USDT
                </span>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">数量</label>
            <div className="relative">
              <Input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                step="0.000001"
              />
              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                {symbol.split('/')[0]}
              </span>
            </div>

            {/* Percentage Buttons */}
            <div className="flex gap-2">
              {[25, 50, 75, 100].map((percent) => (
                <Button
                  key={percent}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePercentClick(percent)}
                  className="flex-1"
                >
                  {percent}%
                </Button>
              ))}
            </div>
          </div>

          {/* Total Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">总额</label>
            <div className="relative">
              <Input
                type="number"
                value={total}
                onChange={(e) => handleTotalChange(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                USDT
              </span>
            </div>
          </div>

          {/* Balance Display */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>可用:</span>
            <span>{balance.toFixed(2)} USDT</span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className={`w-full ${
              side === 'buy'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            size="lg"
          >
            {side === 'buy' ? '买入' : '卖出'} {symbol.split('/')[0]}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
