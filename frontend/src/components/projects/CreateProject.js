import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { projectAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

function CreateProject() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    total_amount: '',
    deadline: '',
  });
  const [milestones, setMilestones] = useState([
    { title: '', description: '', amount: '', due_date: '' }
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', description: '', amount: '', due_date: '' }]);
  };

  const removeMilestone = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index, field, value) => {
    const updated = milestones.map((milestone, i) => 
      i === index ? { ...milestone, [field]: value } : milestone
    );
    setMilestones(updated);
  };

  const calculateTotalMilestones = () => {
    return milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate milestone amounts match total
    const milestoneTotal = calculateTotalMilestones();
    const projectTotal = parseFloat(formData.total_amount);

    if (Math.abs(milestoneTotal - projectTotal) > 0.01) {
      setError(`Milestone amounts (${milestoneTotal}) must equal total amount (${projectTotal})`);
      return;
    }

    setLoading(true);
    try {
      const projectData = {
        ...formData,
        milestones: milestones
      };

      await projectAPI.createProject(projectData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  if (user?.user_type !== 'client') {
    return (
      <Container className="mt-5">
        <Alert variant="warning">Only clients can create projects.</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="mb-4">Create New Project</h2>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                {/* Project Details */}
                <Card className="mb-4">
                  <Card.Header><strong>Project Details</strong></Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Project Title *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                        minLength={5}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Description *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                        minLength={50}
                      />
                      <Form.Text className="text-muted">
                        Minimum 50 characters. Be detailed about your requirements.
                      </Form.Text>
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Total Budget (KES) *</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={formData.total_amount}
                            onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
                            required
                            min="1"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Deadline *</Form.Label>
                          <Form.Control
                            type="datetime-local"
                            value={formData.deadline}
                            onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Milestones */}
                <Card className="mb-4">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <strong>Milestones</strong>
                    <Button variant="primary" size="sm" onClick={addMilestone}>
                      <FiPlus /> Add Milestone
                    </Button>
                  </Card.Header>
                  <Card.Body>
                    {milestones.map((milestone, index) => (
                      <Card key={index} className="mb-3 border">
                        <Card.Body>
                          <div className="d-flex justify-content-between mb-2">
                            <strong>Milestone {index + 1}</strong>
                            {milestones.length > 1 && (
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => removeMilestone(index)}
                              >
                                <FiTrash2 />
                              </Button>
                            )}
                          </div>

                          <Form.Group className="mb-2">
                            <Form.Label>Title *</Form.Label>
                            <Form.Control
                              type="text"
                              value={milestone.title}
                              onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-2">
                            <Form.Label>Description *</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              value={milestone.description}
                              onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                              required
                            />
                          </Form.Group>

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-2">
                                <Form.Label>Amount (KES) *</Form.Label>
                                <Form.Control
                                  type="number"
                                  step="0.01"
                                  value={milestone.amount}
                                  onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                                  required
                                  min="1"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-2">
                                <Form.Label>Due Date *</Form.Label>
                                <Form.Control
                                  type="datetime-local"
                                  value={milestone.due_date}
                                  onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                                  required
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    ))}

                    <Alert variant="info" className="mt-3">
                      <strong>Total Milestones:</strong> KES {calculateTotalMilestones().toFixed(2)} / 
                      KES {parseFloat(formData.total_amount || 0).toFixed(2)}
                    </Alert>
                  </Card.Body>
                </Card>

                <div className="d-flex gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Project'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default CreateProject;