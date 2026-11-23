import WorkflowBuilder from '../../../../components/WorkflowBuilder';
export default async function EditAutomation({ params }){ const { id } = await params; return <WorkflowBuilder id={id} contained/>; }
