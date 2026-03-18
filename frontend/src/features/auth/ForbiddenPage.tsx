import { Link } from 'react-router-dom';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';

export function ForbiddenPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>403 - Access denied</CardTitle>
      </CardHeader>
      <CardBody>
        <p>You do not have permission to access this page.</p>
        <p>
          <Link to="/">Return to dashboard</Link>
        </p>
      </CardBody>
    </Card>
  );
}
