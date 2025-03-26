import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Palette {
        brand: {
            main: string;
            light: string;
            dark: string;
        };
    }
    interface PaletteOptions {
        brand?: {
            main: string;
            light: string;
            dark: string;
        };
    }
}

export const theme = createTheme({
    palette: {
        primary: {
            main: '#4A8B7C',
            light: '#6BAE9E',
            dark: '#2D6A5C',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#8BC0B3',
            light: '#A8D5C9',
            dark: '#5A9B8E',
            contrastText: '#1A3D35',
        },
        background: {
            default: '#F8F9F7',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#1A3D35',
            secondary: '#4A8B7C',
        },
        brand: {
            main: '#4A8B7C',
            light: '#6BAE9E',
            dark: '#2D6A5C',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h3: {
            fontWeight: 800,
            letterSpacing: '-0.02em',
        },
        subtitle1: {
            fontWeight: 500,
            letterSpacing: '0.01em',
        },
    },
    shape: {
        borderRadius: 3,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    background: `
                        linear-gradient(135deg, #ffffff 0%, #F8F9F7 100%),
                        radial-gradient(circle at 100% 0%, rgba(74, 139, 124, 0.4) 0%, transparent 70%),
                        radial-gradient(circle at 0% 100%, rgba(139, 192, 179, 0.4) 0%, transparent 70%)
                    `,
                    backgroundSize: '100% 100%, 100% 100%, 100% 100%',
                    backgroundPosition: '0 0, 0 0, 0 0',
                    backgroundAttachment: 'fixed',
                    minHeight: '100vh',
                    margin: 0,
                    '&::before': {
                        content: '""',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `
                            radial-gradient(circle at 50% 50%, rgba(74, 139, 124, 0.2) 0%, transparent 50%),
                            radial-gradient(circle at 20% 20%, rgba(139, 192, 179, 0.15) 0%, transparent 40%),
                            radial-gradient(circle at 80% 80%, rgba(74, 139, 124, 0.15) 0%, transparent 40%)
                        `,
                        pointerEvents: 'none',
                        zIndex: 0,
                    },
                    '&::after': {
                        content: '""',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 50% 50%, rgba(74, 139, 124, 0.1) 0%, transparent 70%)',
                        pointerEvents: 'none',
                        zIndex: 0,
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    padding: '24px'
                },
            },
            variants: [
                {
                    props: { elevation: 0 },
                    style: {
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 1 },
                    style: {
                        backdropFilter: 'blur(22px)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 2 },
                    style: {
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(0, 0, 0, 0.07)',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 3 },
                    style: {
                        backdropFilter: 'blur(26px)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 4 },
                    style: {
                        backdropFilter: 'blur(28px)',
                        border: '1px solid rgba(0, 0, 0, 0.09)',
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 5 },
                    style: {
                        backdropFilter: 'blur(30px)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 6 },
                    style: {
                        backdropFilter: 'blur(32px)',
                        border: '1px solid rgba(0, 0, 0, 0.11)',
                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 7 },
                    style: {
                        backdropFilter: 'blur(34px)',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                        boxShadow: '0 14px 28px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 8 },
                    style: {
                        backdropFilter: 'blur(36px)',
                        border: '1px solid rgba(0, 0, 0, 0.13)',
                        boxShadow: '0 16px 32px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 9 },
                    style: {
                        backdropFilter: 'blur(38px)',
                        border: '1px solid rgba(0, 0, 0, 0.14)',
                        boxShadow: '0 18px 36px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 10 },
                    style: {
                        backdropFilter: 'blur(40px)',
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 11 },
                    style: {
                        backdropFilter: 'blur(42px)',
                        border: '1px solid rgba(0, 0, 0, 0.16)',
                        boxShadow: '0 22px 44px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 12 },
                    style: {
                        backdropFilter: 'blur(44px)',
                        border: '1px solid rgba(0, 0, 0, 0.17)',
                        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 13 },
                    style: {
                        backdropFilter: 'blur(46px)',
                        border: '1px solid rgba(0, 0, 0, 0.18)',
                        boxShadow: '0 26px 52px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 14 },
                    style: {
                        backdropFilter: 'blur(48px)',
                        border: '1px solid rgba(0, 0, 0, 0.19)',
                        boxShadow: '0 28px 56px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 15 },
                    style: {
                        backdropFilter: 'blur(50px)',
                        border: '1px solid rgba(0, 0, 0, 0.2)',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 16 },
                    style: {
                        backdropFilter: 'blur(52px)',
                        border: '1px solid rgba(0, 0, 0, 0.21)',
                        boxShadow: '0 32px 64px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 17 },
                    style: {
                        backdropFilter: 'blur(54px)',
                        border: '1px solid rgba(0, 0, 0, 0.22)',
                        boxShadow: '0 34px 68px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 18 },
                    style: {
                        backdropFilter: 'blur(56px)',
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        boxShadow: '0 36px 72px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 19 },
                    style: {
                        backdropFilter: 'blur(58px)',
                        border: '1px solid rgba(0, 0, 0, 0.24)',
                        boxShadow: '0 38px 76px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 20 },
                    style: {
                        backdropFilter: 'blur(60px)',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                        boxShadow: '0 40px 80px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 21 },
                    style: {
                        backdropFilter: 'blur(62px)',
                        border: '1px solid rgba(0, 0, 0, 0.26)',
                        boxShadow: '0 42px 84px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 22 },
                    style: {
                        backdropFilter: 'blur(64px)',
                        border: '1px solid rgba(0, 0, 0, 0.27)',
                        boxShadow: '0 44px 88px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 23 },
                    style: {
                        backdropFilter: 'blur(66px)',
                        border: '1px solid rgba(0, 0, 0, 0.28)',
                        boxShadow: '0 46px 92px rgba(0, 0, 0, 0.05)',
                    },
                },
                {
                    props: { elevation: 24 },
                    style: {
                        backdropFilter: 'blur(68px)',
                        border: '1px solid rgba(0, 0, 0, 0.29)',
                        boxShadow: '0 48px 96px rgba(0, 0, 0, 0.05)',
                    },
                },
            ],
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        '& fieldset': {
                            borderColor: 'rgba(0, 0, 0, 0.1)',
                        },
                        '&:hover fieldset': {
                            borderColor: '#FF3366',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#FF3366',
                        },
                        '& input': {
                            color: '#212529',
                        },
                        '& input::placeholder': {
                            color: '#adb5bd',
                        },
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    padding: '8px 16px',
                    height: '40px',
                    '&.Mui-disabled': {
                        background: 'rgba(0, 0, 0, 0.05)',
                    },
                    '@media (max-width: 600px)': {
                        padding: '8px 12px',
                        fontSize: '0.875rem',
                    },
                },
                contained: {
                    '&:hover': {
                        background: '#2D6A5C',
                    },
                },
                outlined: {
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                        borderColor: '#4A8B7C',
                        backgroundColor: 'rgba(74, 139, 124, 0.05)',
                    },
                    '&.Mui-disabled': {
                        borderColor: 'rgba(0, 0, 0, 0.05)',
                        color: 'rgba(0, 0, 0, 0.2)',
                    },
                },
                iconSizeMedium: {
                    padding: '8px',
                    minWidth: '40px',
                    height: '40px',
                },
            },
        },
    },
}); 