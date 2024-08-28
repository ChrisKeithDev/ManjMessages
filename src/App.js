import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './Components/Dashboard';
import Login from './Components/Login';
import ProtectedRoute from './Components/ProtectedRoute';
import { AuthProvider } from './Contexts/AuthContext';
import { UserProvider } from './Contexts/UserContext';
import MessageForm from './Components/MessageForm';

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/message-form" element={<MessageForm />} />
            </Route>
          </Routes>
        </Router>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
