'use client'

import React from 'react'
import { Bell, Volume2, ShieldAlert, Zap, CheckCircle } from 'lucide-react'
import { useSpiritPreferences } from '@/store/spiritPreferences'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SpiritPreferencesPanel() {
  const { notifications, soundEnabled, toggleNotification, toggleSound } = useSpiritPreferences()

  return (
    <Card className="w-full max-w-md border-border/50 bg-black/20 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Spirit Notification Settings
        </CardTitle>
        <CardDescription>
          Configure which events should trigger alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Sound Effects</span>
              <p className="text-xs text-muted-foreground">Play sounds for important events</p>
            </div>
          </div>
          <Switch 
            checked={soundEnabled}
            onCheckedChange={toggleSound}
          />
        </div>

        <div className="h-[1px] bg-border/50" />

        {/* P0: Critical */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Risk Alerts (Critical)</span>
              <p className="text-xs text-muted-foreground">Margin warnings, liquidation risk</p>
            </div>
          </div>
          <Switch 
            checked={notifications.p0}
            onCheckedChange={() => toggleNotification('p0')}
          />
        </div>

        {/* P1: High */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-cyan-500" />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Trading Signals (High)</span>
              <p className="text-xs text-muted-foreground">New opportunities detected</p>
            </div>
          </div>
          <Switch 
            checked={notifications.p1}
            onCheckedChange={() => toggleNotification('p1')}
          />
        </div>

        {/* P2: Normal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Execution Updates (Normal)</span>
              <p className="text-xs text-muted-foreground">Order fills and status changes</p>
            </div>
          </div>
          <Switch 
            checked={notifications.p2}
            onCheckedChange={() => toggleNotification('p2')}
          />
        </div>
      </CardContent>
    </Card>
  )
}


