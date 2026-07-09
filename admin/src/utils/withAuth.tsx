import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Box, CircularProgress, Typography } from '@mui/material';

interface WithAuthProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export default function withAuth(WrappedComponent: React.ComponentType<any>) {
  return function AuthenticatedComponent(props: any) {
    const { admin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !admin) {
        router.push('/login');
      }
    }, [admin, loading, router]);

    if (loading) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          gap={2}
        >
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      );
    }

    if (!admin) {
      return null; // Will redirect to login
    }

    return <WrappedComponent {...props} />;
  };
}