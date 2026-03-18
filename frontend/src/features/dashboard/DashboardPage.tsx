import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';

export function DashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to KineApp</CardTitle>
      </CardHeader>
      <CardBody>
        <p>Frontend foundation is active. Start with Auth, Users, and Clients modules.</p>
      </CardBody>
    </Card>
  );
}
