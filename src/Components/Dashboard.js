// Dashboard.js
import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../Contexts/UserContext";
import {
  Container,
  Row,
  Col,
  ListGroup,
  Button,
  Card,
  Modal,
  InputGroup,
  FormControl,
  Tabs,
  Tab,
} from "react-bootstrap";
import "./Dashboard.css";
import manjShield from "../Assets/manjShield.jpeg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";
import { firestore } from "../firebase-config";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";

const Dashboard = () => {
  const navigate = useNavigate();
  const { logOut, currentUser } = useAuth();
  const [allMessages, setAllMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [selectedTab, setSelectedTab] = useState("Unread");
  const [blinkTab, setBlinkTab] = useState(false);
  const { users } = useContext(UserContext);
  const collectionSecret = process.env.REACT_APP_FIRESTORE_COLLECTION_SECRET;

  // Real-time fetch messages for the current user
  useEffect(() => {
    const currentUserData = users.find(
      (user) => user.email === currentUser.email
    );
    if (currentUserData) {
      const currentUserName = currentUserData.userName;
      const messagesCollectionRef = collection(firestore, collectionSecret);

      // Listen for real-time updates for messages where currentUser is a sender or a recipient
      const unsubscribe = onSnapshot(messagesCollectionRef, (querySnapshot) => {
        const fetchedMessages = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filtering messages that involve the current user as a sender, recipient, or related to their sipCode
        const relevantMessages = fetchedMessages
          .filter(
            (message) =>
              message.sentTo.includes(currentUserData.email) ||
              message.createdBy === currentUserName ||
              message.sipCode === currentUserData.sipCode
          )
          .sort(
            (a, b) => b.messageDateTime.seconds - a.messageDateTime.seconds
          );

        // Filtering for unread calls
        const callsMessages = relevantMessages.filter(
          (message) =>
            message.sipCode === currentUserData.sipCode &&
            (!message.readBy || !message.readBy.includes(currentUser.email))
        );

        setAllMessages(relevantMessages);
        setBlinkTab(callsMessages.length > 0);
      });

      return () => unsubscribe();
    }
  }, [currentUser, users]);

  // Effect for filtering messages based on search query and selected tab
  useEffect(() => {
    const currentUserData = users.find(
      (user) => user.email === currentUser.email
    );
    if (currentUserData) {
      const currentUserName = currentUserData.userName;
      let filteredMessages = [];

      if (searchQuery.trim() !== "") {
        filteredMessages = allMessages.filter((message) =>
          Object.values(message).some(
            (value) =>
              typeof value === "string" &&
              value.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      } else {
        filteredMessages = allMessages;
      }

      switch (selectedTab) {
        case "Unread":
          filteredMessages = filteredMessages.filter(
            (message) =>
              message.sentTo.includes(currentUserData.email) &&
              !(message.readBy || []).includes(currentUserData.email)
          );
          break;
        case "Read":
          filteredMessages = filteredMessages.filter(
            (message) =>
              message.sentTo.includes(currentUserData.email) &&
              (message.readBy || []).includes(currentUserData.email)
          );
          break;
        case "Sent":
          filteredMessages = filteredMessages.filter(
            (message) => message.createdBy === currentUserName
          );
          break;
        case "Calls":
          filteredMessages = filteredMessages.filter(
            (message) => message.sipCode === currentUserData.sipCode
          );
          break;
        default:
          break;
      }

      setDisplayMessages(filteredMessages);
    }
  }, [searchQuery, allMessages, selectedTab, users, currentUser.email]);

  const handleNewMessageClick = () => {
    navigate("/message-form");
  };

  // Function to mark a message as read
  const markMessageAsRead = async (messageId) => {
    if (selectedTab === "Sent") {
      return;
    }
    const messagePath = `${collectionSecret}/${messageId}`;
    const messageRef = doc(firestore, messagePath);

    const currentUserEmail = currentUser.email;

    // check if the message is already read by the current user
    const message = allMessages.find((msg) => msg.id === messageId);
    if (message.readBy && message.readBy.includes(currentUserEmail)) {
      return; // Stop if the message is already read
    }

    try {
      await updateDoc(messageRef, {
        readBy: arrayUnion(currentUserEmail),
      });
      console.log("Message marked as read:", messageId);

      // Update state to reflect this change immediately in the UI
      setAllMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId
            ? { ...msg, readBy: [...(msg.readBy || []), currentUserEmail] }
            : msg
        )
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const deleteMessage = async (messageId, e) => {
    e.stopPropagation(); // Prevent the card's onClick from being called

    // Show a confirmation dialog to the user
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this message?"
    );
    if (!isConfirmed) {
      return; // Stop if the user does not confirm
    }

    const messageRef = doc(
      firestore,
      `${collectionSecret}/${messageId}`
    );
    const archivedRef = collection(
      firestore,
      collectionSecret,
    );

    try {
      // Get the message data before deleting
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        // Move the message to the 'archived' collection
        await addDoc(archivedRef, {
          ...messageDoc.data(),
          archivedAt: new Date(),
        });

        // Delete the message from the 'messages' collection
        await deleteDoc(messageRef);
        console.log("Message archived:", messageId);

        setDisplayMessages((prevMessages) =>
          prevMessages.filter((message) => message.id !== messageId)
        );
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error archiving message:", error);
    }
  };

  const handleSelectTab = (k) => {
    setSelectedTab(k);
    if (k === "Calls") {
      setBlinkTab(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await logOut();
      navigate("/login");
    } catch (error) {
      console.error("Faild to logout", error);
    }
  };

  const handleEditMessage = (message) => {
    markMessageAsRead(message.id);
    navigate("/message-form", { state: { messageData: message } });
  };

  return (
    <Container className="dashboard-container">
      <Row>
        <Col>
          <img src={manjShield} alt="Manj Logo" className="school-logo" />
        </Col>
        <Col>
          <h6 className="dashboard-title">Manj Messages</h6>
          <h6 className="dashboard-title">{currentUser.email}</h6>
        </Col>
        <Col>
          <Button
            className="logout-button"
            size="sm"
            variant="danger"
            onClick={handleLogoutClick}
          >
            Logout
          </Button>
        </Col>
      </Row>
      <Row>
        <InputGroup className="mb-3 mt-2">
          <FormControl
            placeholder="Search messages..."
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
      </Row>
      <Row>
        <Col>
          <Tabs
            id="message-category-tabs"
            activeKey={selectedTab}
            onSelect={(k) => setSelectedTab(k)}
            className="mb-1"
          >
            <Tab eventKey="Unread" title="Unread" />
            <Tab eventKey="Read" title="Read" />
            <Tab eventKey="Sent" title="Sent" />
            <Tab
              eventKey="Calls"
              title={<span className={blinkTab ? "blink" : ""}>Calls</span>}
            />
          </Tabs>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card className="mb-3">
            <Card.Body>
              <ListGroup variant="flush" className="messages-list">
                {displayMessages.length > 0 ? (
                  displayMessages.map((message) => (
                    <Card
                      key={message.id}
                      className={`mb-2 clickable-card ${
                        !(message.readBy || []).includes(currentUser.email)
                          ? "unread-message"
                          : ""
                      }`}
                      onClick={() => {
                        setCurrentMessage(message);
                        setShowModal(true);
                        markMessageAsRead(message.id);
                      }}
                    >
                      <Card.Body className="p-1">
                        <FontAwesomeIcon
                          icon={faTrashAlt}
                          className="fas fa-trash delete-icon"
                          onClick={(e) => deleteMessage(message.id, e)}
                        />
                        <Row>
                          <Col xs={4} className="caller-name">
                            <Card.Text className="mb-0 bold-text">
                              {message.callerName}
                            </Card.Text>
                          </Col>
                          <Col xs={4} className="date-time">
                            <Card.Text className="mb-0">
                              {new Date(
                                message.messageDateTime.seconds * 1000
                              ).toLocaleString("default", {
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Card.Text>
                          </Col>
                          <Col xs={4}>
                            <Card.Text className="text-muted mb-0">
                              {message.createdBy}
                            </Card.Text>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  ))
                ) : (
                  <Card.Text className="text-center">
                    No messages to display
                  </Card.Text>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
          <Button variant="primary" onClick={handleNewMessageClick}>
            Take New Message
          </Button>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Message Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentMessage && (
            <>
              <p>
                <strong>Caller's Name:</strong> {currentMessage.callerName}
              </p>
              <p>
                <strong>Phone Number:</strong> {currentMessage.callerPhoneNum}
              </p>
              <p>
                <strong>Child's Name:</strong> {currentMessage.callerChild}
              </p>
              <p>
                <strong>Message:</strong> {currentMessage.message}
              </p>
              <p>
                <strong>Message Date & Time:</strong>{" "}
                {new Date(
                  currentMessage.messageDateTime.seconds * 1000
                ).toLocaleString()}
              </p>
              <p>
                <strong>Created By:</strong> {currentMessage.createdBy}
              </p>
              <p>
                <strong>Sent To:</strong>
                {Array.isArray(currentMessage.sentTo) ? (
                  currentMessage.sentTo.map((email) => (
                    <div key={email}>{email}</div>
                  ))
                ) : (
                  <div>{currentMessage.sentTo}</div>
                )}
              </p>
              <p>
                <strong>Read By:</strong>
                {currentMessage.readBy && currentMessage.readBy.length > 0 ? (
                  currentMessage.readBy.map((email) => {
                    const user = users.find((u) => u.email === email);
                    return (
                      <div key={email}>{user ? user.userName : email}</div>
                    );
                  })
                ) : (
                  <div>Not read by anyone yet</div>
                )}
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => handleEditMessage(currentMessage)}
          >
            Edit Message
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Dashboard;
