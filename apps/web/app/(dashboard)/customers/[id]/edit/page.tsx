import { CustomerForm } from '@/components/features/customers';

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <CustomerForm mode="edit" customerId={id} />;
}
