import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe('pk_live_51St7dQRexIazabbAxsmNqOLkZT8tEpaJHeAgrauPgISXOQZhMcPhVBJ6TdIVO5tasDigwIbxUOHnVRwS7U3fT3Bd00n3Xobnu7')

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Create payment intent on your backend
      // For demo, we'll simulate with a mock
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 999 }) // $9.99 in cents
      })

      const { clientSecret } = await response.json()

      const cardElement = elements.getElement(CardElement)
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      })

      if (error) {
        setMessage(error.message)
        setSuccess(false)
      } else if (paymentIntent.status === 'succeeded') {
        setMessage('Payment successful!')
        setSuccess(true)
      }
    } catch (error) {
      setMessage('Payment failed: ' + error.message)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h3>Stripe Payment Demo</h3>
      <p>Test card: <strong>4242 4242 4242 4242</strong></p>
      <p>Any future expiry, any CVC, any ZIP</p>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' }
                }
              }
            }}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={!stripe || loading}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: success ? '#4CAF50' : '#5469d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : success ? 'Payment Successful!' : 'Pay $9.99'}
        </button>
        
        {message && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: success ? '#d4edda' : '#f8d7da',
            color: success ? '#155724' : '#721c24',
            borderRadius: '4px'
          }}>
            {message}
          </div>
        )}
      </form>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Note:</strong> This is a test integration. No real money will be charged.</p>
        <p>For production, you need:</p>
        <ol>
          <li>Stripe account with API keys</li>
          <li>Backend server to create payment intents</li>
          <li>Webhook handling for payment confirmation</li>
          <li>SSL certificate (HTTPS)</li>
        </ol>
      </div>
    </div>
  )
}

export default function Payment() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  )
}