import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

export default function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`card-content ${className}`} {...props}>
      {children}
    </div>
  );
}

CardContent.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
