'use client';

import { useState } from 'react';
import { Address } from '@prisma/client';
import { AddressForm } from './AddressForm';

interface AddressListProps {
  addresses: Address[];
}

export function AddressList({ addresses }: AddressListProps) {
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      const response = await fetch(`/api/addresses/${addressId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete address');
      }

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error('Delete address error:', error);
      // Handle error (show error message)
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await fetch(`/api/addresses/${addressId}/default`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error('Failed to set default address');
      }

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error('Set default address error:', error);
      // Handle error (show error message)
    }
  };

  if (addresses.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">No addresses found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add a new address to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {addresses.map((address) => (
        <div
          key={address.id}
          className="bg-white shadow rounded-lg overflow-hidden"
        >
          <div className="px-4 py-5 sm:p-6">
            {editingAddress?.id === address.id ? (
              <AddressForm
                address={address}
                onCancel={() => setEditingAddress(null)}
                onSuccess={() => {
                  setEditingAddress(null);
                  window.location.reload();
                }}
              />
            ) : (
              <>
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {address.name}
                      {address.isDefault && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Default
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {address.street}
                    </p>
                    <p className="text-sm text-gray-500">
                      {address.city}, {address.state} {address.postalCode}
                    </p>
                    <p className="text-sm text-gray-500">
                      Phone: {address.phone}
                    </p>
                  </div>
                  <div className="space-x-4">
                    <button
                      onClick={() => setEditingAddress(address)}
                      className="text-sm font-medium text-primary hover:text-primary-dark"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="text-sm font-medium text-gray-600 hover:text-gray-700"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}