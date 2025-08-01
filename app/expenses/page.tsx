"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  PlusCircle, 
  Receipt, 
  DollarSign, 
  Clock,
  FileText,
  CreditCard
} from 'lucide-react'
import { ExpenseForm } from '@/components/expense-form'
import { ExpenseListEnhanced } from '@/components/expense-list-enhanced'

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState('list')

  const handleExpenseCreated = () => {
    // Switch back to list view after creating expense
    setActiveTab('list')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">
            Submit and manage your business expenses with multiple payment methods
          </p>
        </div>
        
        <Button 
          onClick={() => setActiveTab('create')}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          New Expense
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Submitted</p>
                <p className="text-2xl font-bold">$2,847.50</p>
              </div>
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">$1,245.00</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">$1,602.50</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">14</p>
                <p className="text-xs text-muted-foreground">expenses</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Expenses
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Expense
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Your Expenses</CardTitle>
              <CardDescription>
                View and manage all your submitted expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseListEnhanced />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Expense</CardTitle>
              <CardDescription>
                Submit a new expense for approval with receipt and payment method selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseForm onExpenseCreated={handleExpenseCreated} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Methods Info */}
      <Card>
        <CardHeader>
          <CardTitle>Available Payment Methods</CardTitle>
          <CardDescription>
            Choose the appropriate payment method for your expense
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <h4 className="font-semibold">Person Reimbursement</h4>
                <p className="text-sm text-muted-foreground">Personal expense reimbursement</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h4 className="font-semibold">Purchase Order</h4>
                <p className="text-sm text-muted-foreground">Pre-approved purchase order</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div>
                <h4 className="font-semibold">Company Credit Card</h4>
                <p className="text-sm text-muted-foreground">Corporate credit card expense</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Receipt className="h-8 w-8 text-orange-600" />
              <div>
                <h4 className="font-semibold">Direct Vendor</h4>
                <p className="text-sm text-muted-foreground">Direct vendor payment</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}