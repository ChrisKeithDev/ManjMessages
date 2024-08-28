// src/Components/MessageForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { firestore } from '../firebase-config';
import { Form, Button, Container, Row, Col, Badge } from 'react-bootstrap';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../Contexts/AuthContext';

const MessageForm = () => {
    const [message, setMessage] = useState('');
    const [callerName, setCallerName] = useState('');
    const [callerPhoneNum, setCallerPhoneNum] = useState('');
    const [callerChild, setCallerChild] = useState('');
    const [recipientIds, setRecipientIds] = useState([]);
    const [sipCode, setSipCode] = useState('');
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const [messageId, setMessageId] = useState(null);
    const messagesCollection = process.env.REACT_APP_FIRESTORE_MESSAGES_COLLECTION;
    const usersCollection = process.env.REACT_APP_FIRESTORE_USERS_COLLECTION;

    // Extract callData from location state
    useEffect(() => {
      if (location.state && location.state.messageData) {
          const {
              id,
              callerName,
              callerPhoneNum,
              callerChild,
              message,
              sentTo,
              sipCode
          } = location.state.messageData;
          
          setMessageId(id || null);
          setCallerName(callerName || '');
          setCallerPhoneNum(callerPhoneNum || '');
          setCallerChild(callerChild || '');
          setMessage(message || '');
          setRecipientIds(sentTo || []);
          setSipCode(sipCode || '');
      }
  }, [location.state]);
  
  

    useEffect(() => {
        const fetchUsers = async () => {
            const usersCollectionRef = collection(firestore, usersCollection);
            const usersSnapshot = await getDocs(usersCollectionRef);
            setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const currentUserData = users.find(user => user.email === currentUser.email);
        const currentUserName = currentUserData ? currentUserData.userName : null;

        if (!currentUserName) {
            console.error("Current user's userName not found.");
            return;
        }
        const messageDocData = {
            callerName,
            callerPhoneNum,
            callerChild,
            message,
            messageDateTime: new Date(),
            createdBy: currentUserName,
            sentTo: recipientIds,
            readBy: [],
            sipCode,
        };

        try {
          if (messageId) {
            // It's an update
            const messageRef = doc(firestore, `${messagesCollection}/${messageId}`);
            await updateDoc(messageRef, messageDocData);
            console.log("Message updated!");
        } else {
            // It's a new message
            const orgMessagesRef = collection(firestore, messagesCollection);
            await addDoc(orgMessagesRef, messageDocData);
            console.log("Message successfully sent!");
        }

            setMessage('');
            setCallerName('');
            setCallerPhoneNum('');
            setCallerChild('');
            setRecipientIds([]);
            navigate(-1);
        } catch (error) {
            console.error("Failed to send the message:", error);
        }
    };

  // Function to toggle recipient selection
  const toggleRecipientSelection = (email) => {
    setRecipientIds(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col xs={12}>
          <Button variant="secondary" onClick={handleBackClick} className='mb-3 mt-2'>← Back</Button>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Row>
                <Col xs={12} md={4}>
                  <Form.Label>Caller's Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    placeholder="..." />
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={callerPhoneNum}
                    onChange={(e) => setCallerPhoneNum(e.target.value)}
                    placeholder="..." />
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label>Child, if any</Form.Label>
                  <Form.Control
                    type="text"
                    value={callerChild}
                    onChange={(e) => setCallerChild(e.target.value)}
                    placeholder="..." />
                </Col>
              </Row>
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="..." />
              <Form.Group className="mb-3 mt-2">
                <Form.Label>Select Recipients</Form.Label>
                <div>
                  {users.map(user => {
                    const isSelected = recipientIds.includes(user.email);
                    return (
                      <Badge
                        key={user.id}
                        bg={isSelected ? "primary" : "light"}
                        text={isSelected ? "white" : "dark"}
                        className="me-2 mt-1 p-2"
                        onClick={() => toggleRecipientSelection(user.email)}
                        style={{ cursor: 'pointer' }}
                      >
                        {user.userName}
                      </Badge>
                    );
                  })}
                </div>
              </Form.Group>
            </Form.Group>
            <Button variant="primary" type="submit" onClick={handleSubmit}>
              Send Message
            </Button>
          </Form>
        </Col>
      </Row>
    </Container >
  );
};

export default MessageForm;
