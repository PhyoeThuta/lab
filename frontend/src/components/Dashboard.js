import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function Dashboard({ token, user, onLogout, apiBase }) {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [newOrder, setNewOrder] = useState({
    product_name: '',
    quantity: 1,
    price: 0
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${apiBase}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders);
    } catch (err) {
      setError('Failed to fetch orders');
    }
  }, [apiBase, token]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${apiBase}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to fetch users');
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchOrders, fetchUsers]);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(`${apiBase}/orders`, newOrder, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Order created successfully!');
      setNewOrder({ product_name: '', quantity: 1, price: 0 });
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
    }
  };

  return (
    <div>
      <nav className="navbar">
        <h1>Microservices Dashboard Tech Throne</h1>
        <div>
          <span style={{ marginRight: '20px' }}>
            Welcome, {user?.username} 
            <span className={`badge ${user?.role}`} style={{ marginLeft: '10px' }}>
              {user?.role}
            </span>
          </span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {activeTab === 'orders' && (
          <div>
            <div className="card">
              <h3>Create New Order</h3>
              <form onSubmit={handleOrderSubmit}>
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    value={newOrder.product_name}
                    onChange={(e) => setNewOrder({ ...newOrder, product_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newOrder.price}
                    onChange={(e) => setNewOrder({ ...newOrder, price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <button type="submit">Create Order</button>
              </form>
            </div>

            <div className="card">
              <h3>My Orders</h3>
              {orders.length === 0 ? (
                <p>No orders yet</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.product_name}</td>
                        <td>{order.quantity}</td>
                        <td>${parseFloat(order.price).toFixed(2)}</td>
                        <td>${parseFloat(order.total).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card">
            <h3>User Profiles</h3>
            {users.length === 0 ? (
              <p>No user profiles yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Full Name</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.user_id}</td>
                      <td>{u.full_name || 'N/A'}</td>
                      <td>{u.phone || 'N/A'}</td>
                      <td>{u.address || 'N/A'}</td>
                      <td>{new Date(u.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
