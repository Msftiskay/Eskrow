import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { projectAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { FiPlus, FiFolder, FiClock, FiCheckCircle } from 'react-icons/fi';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getProjects();
      setProjects(response.data);
      
      // Calculate stats
      const total = response.data.length;
      const active = response.data.filter(p => p.status === 'active' || p.status === 'in_progress').length;
      const completed = response.data.filter(p => p.status === 'completed').length;
      
      setStats({ total, active, completed });
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'secondary',
      active: 'primary',
      in_progress: 'info',
      completed: 'success',
      disputed: 'danger',
      cancelled: 'dark',
    };
    return badges[status] || 'secondary';
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Dashboard</h2>
        {user?.user_type === 'client' && (
          <Link to="/projects/create">
            <Button variant="primary">
              <FiPlus className="me-2" />
              Create New Project
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <FiFolder size={32} className="mb-2 text-primary" />
              <h3>{stats.total}</h3>
              <p className="text-muted mb-0">Total Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <FiClock size={32} className="mb-2 text-warning" />
              <h3>{stats.active}</h3>
              <p className="text-muted mb-0">Active Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center shadow-sm">
            <Card.Body>
              <FiCheckCircle size={32} className="mb-2 text-success" />
              <h3>{stats.completed}</h3>
              <p className="text-muted mb-0">Completed</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Projects List */}
      <h4 className="mb-3">Your Projects</h4>
      {projects.length === 0 ? (
        <Card className="text-center p-5">
          <Card.Body>
            <p className="text-muted">No projects yet</p>
            {user?.user_type === 'client' && (
              <Link to="/projects/create">
                <Button variant="primary">Create Your First Project</Button>
              </Link>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {projects.map((project) => (
            <Col md={6} lg={4} key={project.id} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>{project.title}</Card.Title>
                  <Card.Text className="text-muted">
                    {project.description.substring(0, 100)}...
                  </Card.Text>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className={`badge bg-${getStatusBadge(project.status)}`}>
                      {project.status}
                    </span>
                    <strong>KES {project.total_amount}</strong>
                  </div>
                  <Link to={`/projects/${project.id}`}>
                    <Button variant="outline-primary" size="sm" className="w-100">
                      View Details
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default Dashboard;