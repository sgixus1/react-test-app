import { useState } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'

export default function PayPalPayment() {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [orderID, setOrderID] = useState('')

  const paypalOptions = {
    'client-id': 'AUrXzkz4yQn70rW3tE2iL3gvXXqjfub2dPdc4miSVGux43L_KE7TSb5ljhMtWsyHvmULeFdC4BunoU8-',
    currency: 'USD',
    intent: 'capture'
  }

  const createOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [{
        description: 'Premium Access',
        amount: {
          value: '9.99',
          currency_code: 'USD'
        }
      }],
      application_context: {
        shipping_preference: 'NO_SHIPPING' // Skip shipping address
      }
    })
  }

  const onApprove = async (data, actions) => {
    try {
      const details = await actions.order.capture()
      setSuccess(true)
      setOrderID(details.id)
      console.log('Payment completed:', details)
    } catch (err) {
      setError('Payment failed: ' + err.message)
    }
  }

  const onError = (err) => {
    setError('PayPal error: ' + err.message)
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h3>PayPal Payment</h3>
      <p>Pay $9.99 with PayPal, Venmo, or credit card</p>
      
      <div style={{ 
        margin: '20px 0', 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <PayPalScriptProvider options={paypalOptions}>
          <PayPalButtons
            style={{ layout: 'vertical' }}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={onError}
          />
        </PayPalScriptProvider>
      </div>

      {success && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '4px'
        }}>
          <p><strong>Payment Successful!</strong></p>
          <p>Order ID: {orderID}</p>
          <p>Thank you for your purchase.</p>
        </div>
      )}

      {error && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px'
        }}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Note:</strong> This uses PayPal sandbox for testing.</p>
        <p>For production, you need:</p>
        <ol>
          <li>PayPal Business account</li>
          <li>Live Client ID (not sandbox)</li>
          <li>Webhook setup for payment notifications</li>
          <li>SSL certificate (HTTPS required)</li>
        </ol>
      </div>
    </div>
  )
}