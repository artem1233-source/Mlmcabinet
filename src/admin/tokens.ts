// Design Tokens для H2 Platform Admin Panel

export const tokens = {
  // Layout tokens
  layout: {
    headerHeight: '72px' // Единая высота header-блока для AdminSidebar brand и AdminTopbar
  },
  colors: {
    primary: '#39B7FF',
    accent: '#12C9B6',
    background: '#F7FAFC',
    card: '#FFFFFF',
    border: '#E6E9EE',
    text: {
      primary: '#1E1E1E',
      secondary: '#666666',
      muted: '#999999'
    },
    status: {
      draft: '#9CA3AF',
      pending: '#F59E0B',
      paid: '#10B981',
      processing: '#3B82F6',
      shipped: '#8B5CF6',
      delivered: '#10B981',
      cancelled: '#EF4444',
      refund: '#F59E0B',
      error: '#EF4444'
    },
    alert: {
      critical: {
        bg: '#FEF2F2',
        border: '#FECACA',
        text: '#991B1B',
        icon: '#DC2626'
      },
      warning: {
        bg: '#FFFBEB',
        border: '#FED7AA',
        text: '#92400E',
        icon: '#F59E0B'
      },
      info: {
        bg: '#EFF6FF',
        border: '#BFDBFE',
        text: '#1E40AF',
        icon: '#3B82F6'
      }
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px'
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  typography: {
    kpi: {
      small: {
        fontSize: '20px',
        fontWeight: '700',
        lineHeight: '28px'
      },
      medium: {
        fontSize: '24px',
        fontWeight: '700',
        lineHeight: '32px'
      },
      large: {
        fontSize: '36px',
        fontWeight: '700',
        lineHeight: '40px'
      }
    },
    heading: {
      h1: {
        fontSize: '24px',
        fontWeight: '700',
        lineHeight: '32px'
      },
      h2: {
        fontSize: '20px',
        fontWeight: '600',
        lineHeight: '28px'
      },
      h3: {
        fontSize: '16px',
        fontWeight: '600',
        lineHeight: '24px'
      }
    },
    body: {
      regular: {
        fontSize: '14px',
        fontWeight: '400',
        lineHeight: '20px'
      },
      medium: {
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '20px'
      },
      small: {
        fontSize: '12px',
        fontWeight: '400',
        lineHeight: '16px'
      }
    }
  }
};