import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Alert, ListGroup } from 'react-bootstrap';
import { projectAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { FiClock, FiDollarSign, FiUser, FiCalendar } from 'react-icons/fi';

function ProjectDetail() {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await projectAPI.getProject(id);
      setProject(response.data);
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProject = async () => {
    setActionLoading(true);
    try {
      await projectAPI.acceptProject(id);
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitMilestone = async (milestoneId) => {
    setActionLoading(true);
    try {
      await projectAPI.submitMilestone(id, milestoneId);
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit milestone');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveMilestone = async (milestoneId) => {
    setActionLoading(true);
    try {
      await projectAPI.approveMilestone(id, milestoneId);
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve milestone');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      active: 'primary',
      in_progress: 'info',
      completed: 'success',
      disputed: 'danger',
    };
    return variants[status] || 'secondary';
  };

  const getMilestoneStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      submitted: 'warning',
      approved: 'success',
      rejected: 'danger',
    };
    return variants[status] || 'secondary';
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border" role="status"></div>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">Project not found</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{project.title}</h2>
        <Badge bg={getStatusBadge(project.status)} className="fs-6">
          {project.status}
        </Badge>
      </div>

      <Row>
        <Col lg={8}>
          {/* Project Description */}
          <Card className="mb-4 shadow-sm">
            <Card.Header><strong>Project Description</strong></Card.Header>
            <Card.Body>
              <p>{project.description}</p>
            </Card.Body>
          </Card>

          {/* Milestones */}
          <Card className="shadow-sm">
            <Card.Header><strong>Milestones</strong></Card.Header>
            <Card.Body>
              {project.milestones && project.milestones.length > 0 ? (
                <ListGroup variant="flush">
                  {project.milestones.map((milestone, index) => (
                    <ListGroup.Item key={milestone.id} className="border-bottom">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6>Milestone {index + 1}: {milestone.title}</h6>
                          <p className="text-muted mb-1">{milestone.description}</p>
                          <small className="text-muted">
                            <FiCalendar className="me-1" />
                            Due: {new Date(milestone.due_date).toLocaleDateString()}
                          </small>
                        </div>
                        <div className="text-end">
                          <Badge bg={getMilestoneStatusBadge(milestone.status)} className="mb-2">
                            {milestone.status}
                          </Badge>
                          <div><strong>KES {milestone.amount}</strong></div>
                        </div>
                      </div>

                      {/* Actions for creative */}
                      {user?.user_type === 'creative' && 
                       user?.id === project.creative?.id && 
                       milestone.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleSubmitMilestone(milestone.id)}
                          disabled={actionLoading}
                        >
                          Submit for Review
                        </Button>
                      )}

                      {/* Actions for client */}
                      {user?.user_type === 'client' && 
                       user?.id === project.client?.id && 
                       milestone.status === 'submitted' && (
                        <Button 
                          size="sm" 
                          variant="success"
                          onClick={() => handleApproveMilestone(milestone.id)}
                          disabled={actionLoading}
                        >
                          Approve Milestone
                        </Button>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted">No milestones defined</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Project Info */}
          <Card className="mb-4 shadow-sm">
            <Card.Header><strong>Project Information</strong></Card.Header>
            <Card.Body>
              <div className="mb-3">
                <small className="text-muted d-flex align-items-center mb-1">
                  <FiDollarSign className="me-2" /> Total Budget
                </small>
                <h4>KES {project.total_amount}</h4>
              </div>

              <div className="mb-3">
                <small className="text-muted d-flex align-items-center mb-1">
                  <FiCalendar className="me-2" /> Deadline
                </small>
                <p>{new Date(project.deadline).toLocaleDateString()}</p>
              </div>

              <div className="mb-3">
                <small className="text-muted d-flex align-items-center mb-1">
                  <FiUser className="me-2" /> Client
                </small>
                <p>{project.client?.username || 'N/A'}</p>
              </div>

              {project.creative && (
                <div className="mb-3">
                  <small className="text-muted d-flex align-items-center mb-1">
                    <FiUser className="me-2" /> Creative Professional
                  </small>
                  <p>{project.creative.username}</p>
                </div>
              )}

              {/* Accept Project Button */}
              {user?.user_type === 'creative' && 
               !project.creative && 
               project.status === 'draft' && (
                <Button 
                  variant="success" 
                  className="w-100"
                  onClick={handleAcceptProject}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Accepting...' : 'Accept Project'}
                </Button>
              )}
            </Card.Body>
          </Card>

          {/* Smart Contract Info */}
          {project.smart_contract_address && (
            <Card className="shadow-sm">
              <Card.Header><strong>Blockchain</strong></Card.Header>
              <Card.Body>
                <small className="text-muted">Smart Contract Address</small>
                <p className="font-monospace small text-break">
                  {project.smart_contract_address}
                </p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <div className="mt-4">
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </Container>
  );
}

export default ProjectDetail;