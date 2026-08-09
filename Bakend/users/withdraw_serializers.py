from rest_framework import serializers
from .models import Transaction, User


class WithdrawSerializer(serializers.Serializer):
    """Serializer para solicitudes de retiro de USDT."""
    wallet_address = serializers.CharField(
        max_length=66,
        help_text="Dirección Ethereum/Polygon de destino (0x...)"
    )
    boost_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=1,
        help_text="Cantidad de BOOST a retirar"
    )
    network = serializers.CharField(max_length=20, required=False, default='polygon')
    
    def validate_wallet_address(self, value):
        """Valida la dirección según el tipo de red si se proporciona en el contexto de validación."""
        # Note: the 'network' field is validated separately in validate()
        return value

    def validate(self, data):
        wallet = data.get('wallet_address', '').strip()
        network = (data.get('network') or 'polygon').lower()

        if network in ('polygon', 'bsc', 'ethereum', 'evm'):
            if not wallet.startswith('0x') or len(wallet) != 42:
                raise serializers.ValidationError({'wallet_address': "La dirección debe comenzar con 0x y tener 42 caracteres"})
            try:
                int(wallet[2:], 16)
            except ValueError:
                raise serializers.ValidationError({'wallet_address': "Dirección hexadecimal inválida"})

        elif network == 'tron':
            if not wallet.startswith('T') or len(wallet) != 34:
                raise serializers.ValidationError({'wallet_address': "Dirección TRON inválida"})

        elif network == 'omni' or network == 'bitcoin':
            if not (wallet.startswith('1') or wallet.startswith('3') or wallet.lower().startswith('bc1')):
                raise serializers.ValidationError({'wallet_address': "Dirección Bitcoin/Omni inválida"})

        else:
            raise serializers.ValidationError({'network': 'Red desconocida'})

        return data
    
    def validate_boost_amount(self, value):
        """Valida el monto mínimo."""
        if value < 100:  # Mínimo 1 USDT = 100 BOOST
            raise serializers.ValidationError("Monto mínimo: 100 BOOST (1 USDT)")
        return value


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer para ver transacciones."""
    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_type', 'status', 'usdt_amount', 'boost_amount',
            'tx_hash', 'tx_status', 'created_at', 'description'
        ]
        read_only_fields = fields
